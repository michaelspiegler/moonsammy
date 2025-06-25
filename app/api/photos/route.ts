import { list } from "@vercel/blob"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "24")
    const offset = (page - 1) * limit

    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({
        photos: [],
        totalPhotos: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        error: "Vercel Blob token not found. Please check the integration setup.",
      })
    }

    let blobs = []

    try {
      console.log("Fetching blob list...")
      const blobResult = await list()
      blobs = blobResult.blobs
      console.log("Found blobs:", blobs.length)
    } catch (blobError) {
      console.error("Blob API error:", blobError)

      // Handle specific Blob API errors
      if (blobError instanceof Error) {
        if (blobError.message.includes("Too Many Requests") || blobError.message.includes("rate limit")) {
          return NextResponse.json({
            photos: [],
            totalPhotos: 0,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            error: "Rate limit reached. Please wait a moment and refresh the page.",
            retryAfter: 60,
          })
        }

        if (blobError.message.includes("quota") || blobError.message.includes("limit exceeded")) {
          return NextResponse.json({
            photos: [],
            totalPhotos: 0,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            error: "Storage quota exceeded. Please contact the administrator.",
          })
        }
      }

      // For other blob errors, try to continue with database-only data
      console.log("Blob API unavailable, checking database for cached data...")
    }

    // Filter out profile pictures from gallery (exclude files starting with "profile-")
    const galleryBlobs = blobs.filter((blob) => !blob.pathname.startsWith("profile-"))

    // Sort by upload date, newest first
    galleryBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    const totalPhotos = galleryBlobs.length
    const totalPages = Math.ceil(totalPhotos / limit)
    const paginatedBlobs = galleryBlobs.slice(offset, offset + limit)

    const photos = paginatedBlobs.map((blob) => ({
      id: blob.pathname,
      url: blob.url,
      filename: blob.pathname.split("-").slice(2).join("-") || blob.pathname,
      uploadedAt: blob.uploadedAt,
      uploaderName: "",
      uploaderProfileImage: null,
      title: "",
      year: null,
      tags: [],
      comments: [],
      likes: [],
    }))

    // Try to get metadata from database
    if (process.env.DATABASE_URL && photos.length > 0) {
      try {
        const sql = neon(process.env.DATABASE_URL)

        // Create tables if they don't exist
        await sql`
          CREATE TABLE IF NOT EXISTS photo_metadata (
            id TEXT PRIMARY KEY,
            title TEXT DEFAULT '',
            year INTEGER,
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

        await sql`
          CREATE TABLE IF NOT EXISTS likes (
            id TEXT PRIMARY KEY,
            photo_id TEXT NOT NULL,
            author TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(photo_id, author)
          )
        `

        await sql`
          CREATE TABLE IF NOT EXISTS photo_uploads (
            id TEXT PRIMARY KEY,
            uploader_name TEXT NOT NULL,
            uploader_profile_image TEXT,
            user_id TEXT,
            original_filename TEXT NOT NULL,
            blob_url TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT NOW()
          )
        `

        await sql`
          CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `

        await sql`
          CREATE TABLE IF NOT EXISTS photo_tags (
            id TEXT PRIMARY KEY,
            photo_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(photo_id, tag_id)
          )
        `

        // Get metadata for current page photos only
        const photoIds = photos.map((p) => p.id)
        const [metadata, comments, likes, uploads, photoTagsData] = await Promise.all([
          sql`SELECT * FROM photo_metadata WHERE id = ANY(${photoIds})`,
          sql`SELECT * FROM comments WHERE photo_id = ANY(${photoIds}) ORDER BY created_at ASC`,
          sql`SELECT * FROM likes WHERE photo_id = ANY(${photoIds}) ORDER BY created_at ASC`,
          sql`SELECT * FROM photo_uploads WHERE id = ANY(${photoIds})`,
          sql`
            SELECT pt.photo_id, t.id as tag_id, t.name as tag_name
            FROM photo_tags pt
            JOIN tags t ON pt.tag_id = t.id
            WHERE pt.photo_id = ANY(${photoIds})
            ORDER BY t.name
          `,
        ])

        // Merge metadata with photos
        const photosWithMetadata = photos.map((photo) => {
          const meta = metadata.find((m) => m.id === photo.id)
          const upload = uploads.find((u) => u.id === photo.id)
          const photoComments = comments
            .filter((c) => c.photo_id === photo.id)
            .map((c) => ({
              id: c.id,
              author: c.author,
              content: c.content,
              timestamp: c.created_at,
            }))
          const photoLikes = likes
            .filter((l) => l.photo_id === photo.id)
            .map((l) => ({
              id: l.id,
              author: l.author,
              timestamp: l.created_at,
            }))
          const photoTags = photoTagsData
            .filter((pt) => pt.photo_id === photo.id)
            .map((pt) => ({
              id: pt.tag_id,
              name: pt.tag_name,
            }))

          return {
            ...photo,
            uploaderName: upload?.uploader_name || "",
            uploaderProfileImage: upload?.uploader_profile_image || null,
            title: meta?.title || "",
            year: meta?.year || null,
            tags: photoTags,
            comments: photoComments,
            likes: photoLikes,
          }
        })

        return NextResponse.json({
          photos: photosWithMetadata,
          totalPhotos,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        })
      } catch (dbError) {
        console.error("Database error:", dbError)
        // Continue with blob-only data
      }
    }

    return NextResponse.json({
      photos,
      totalPhotos,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    })
  } catch (error) {
    console.error("Error fetching photos:", error)
    return NextResponse.json({
      photos: [],
      totalPhotos: 0,
      currentPage: 1,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
      error: "Failed to load photos. Please try refreshing the page.",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
