import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { list } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

// Check admin authentication
async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-session")?.value === "authenticated"
}

export async function GET(request: Request) {
  try {
    if (!(await checkAuth())) {
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
