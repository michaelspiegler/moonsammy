import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { list } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

// Check admin role authentication using the same session system as regular auth
async function checkAdminAuth() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("🔍 Admin photos API: No database URL")
      return false
    }

    const cookieStore = await cookies()

    // Use the same session cookie names as the main auth system
    const sessionId =
      cookieStore.get("session")?.value ||
      cookieStore.get("auth-session")?.value ||
      cookieStore.get("user-session")?.value

    if (!sessionId) {
      console.log("🔍 Admin photos API: No session ID found")
      return false
    }

    console.log("🔍 Admin photos API: Using session ID:", sessionId.substring(0, 20) + "...")

    const sql = neon(process.env.DATABASE_URL)

    // Check if user has admin role using the same query structure as auth/me
    const sessions = await sql`
      SELECT u.role, u.name, u.email, s.expires_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    if (sessions.length === 0) {
      console.log("🔍 Admin photos API: No valid session found")
      return false
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    console.log("🔍 Admin photos API: Session details:")
    console.log("  - User:", session.name)
    console.log("  - Email:", session.email)
    console.log("  - Role:", session.role)
    console.log("  - Expires:", expiresAt.toISOString())
    console.log("  - Valid:", expiresAt > now)

    if (expiresAt <= now) {
      console.log("🔍 Admin photos API: Session expired")
      return false
    }

    const isAdmin = session.role === "Admin"
    console.log("🔍 Admin photos API: Is admin?", isAdmin, "(role:", session.role, ")")

    return isAdmin
  } catch (error) {
    console.error("🔍 Admin photos API: Auth check failed:", error)
    return false
  }
}

export async function GET(request: Request) {
  try {
    if (!(await checkAdminAuth())) {
      console.log("🔍 Admin photos API: Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50") // Higher limit for admin
    const offset = (page - 1) * limit

    // Get photos from Vercel Blob with error handling
    let blobs = []
    try {
      console.log("Admin: Fetching blob list...")
      const blobResult = (await Promise.race([
        list(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Blob API timeout")), 15000)),
      ])) as any

      blobs = blobResult.blobs || []
      console.log("Admin: Found blobs:", blobs.length)
    } catch (blobError) {
      console.error("Admin: Blob API error:", blobError)

      // Handle specific blob errors
      if (blobError instanceof Error) {
        if (blobError.message.includes("Too Many Requests") || blobError.message.includes("rate limit")) {
          return NextResponse.json({
            photos: [],
            totalPhotos: 0,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            error: "Blob API rate limit reached. Please wait a moment and try again.",
          })
        }

        if (blobError.message.includes("timeout")) {
          return NextResponse.json({
            photos: [],
            totalPhotos: 0,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            error: "Blob API timed out. Please try again.",
          })
        }
      }

      return NextResponse.json({
        photos: [],
        totalPhotos: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        error: "Failed to fetch photos from Blob storage. Please try again.",
      })
    }

    // Sort by upload date, newest first
    blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    const totalPhotos = blobs.length
    const totalPages = Math.ceil(totalPhotos / limit)
    const paginatedBlobs = blobs.slice(offset, offset + limit)

    // Get metadata from database if available
    let photosWithMetadata = paginatedBlobs.map((blob) => ({
      id: blob.pathname,
      url: blob.url,
      filename: blob.pathname.split("-").slice(2).join("-") || blob.pathname,
      uploadedAt: blob.uploadedAt,
      title: "",
      comments: [],
    }))

    // Try to get metadata from database
    if (process.env.DATABASE_URL && photosWithMetadata.length > 0) {
      try {
        const sql = neon(process.env.DATABASE_URL)

        // Create tables if they don't exist
        await sql`
          CREATE TABLE IF NOT EXISTS photo_metadata (
            id TEXT PRIMARY KEY,
            title TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW()
          )
        `

        await sql`
          CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            photo_id TEXT NOT NULL,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `

        // Get metadata for current page photos with timeout
        const photoIds = photosWithMetadata.map((p) => p.id)
        const [metadata, comments] = (await Promise.race([
          Promise.all([
            sql`SELECT * FROM photo_metadata WHERE id = ANY(${photoIds})`,
            sql`SELECT * FROM comments WHERE photo_id = ANY(${photoIds}) ORDER BY created_at ASC`,
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Database query timeout")), 10000)),
        ])) as any[]

        // Merge metadata with photos
        photosWithMetadata = photosWithMetadata.map((photo) => {
          const meta = metadata.find((m) => m.id === photo.id)
          const photoComments = comments
            .filter((c) => c.photo_id === photo.id)
            .map((c) => ({
              id: c.id,
              author: c.author,
              content: c.content,
              timestamp: c.created_at,
              photoId: c.photo_id,
            }))

          return {
            ...photo,
            title: meta?.title || "",
            comments: photoComments,
          }
        })
      } catch (dbError) {
        console.error("Admin: Database error:", dbError)
        // Continue with blob-only data if database fails
      }
    }

    return NextResponse.json({
      photos: photosWithMetadata,
      totalPhotos,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    })
  } catch (error) {
    console.error("Error fetching admin photos:", error)
    return NextResponse.json(
      {
        photos: [],
        totalPhotos: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        error: "Failed to fetch photos. Please try again.",
      },
      { status: 500 },
    )
  }
}
