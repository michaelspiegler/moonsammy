import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterTag = searchParams.get("filter")

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        tags: [],
        photos: [],
        error: "Database not configured",
      })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Create tables if they don't exist
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

    if (filterTag) {
      // Get photos with specific tag
      const photos = await sql`
        SELECT DISTINCT pu.id, pu.blob_url, pu.original_filename, pu.uploaded_at, 
               pu.uploader_name, pu.uploader_profile_image,
               pm.title, pm.year
        FROM photo_uploads pu
        JOIN photo_tags pt ON pu.id = pt.photo_id
        JOIN tags t ON pt.tag_id = t.id
        LEFT JOIN photo_metadata pm ON pu.id = pm.id
        WHERE t.name = ${filterTag}
        ORDER BY pu.uploaded_at DESC
      `

      const formattedPhotos = photos.map((photo) => ({
        id: photo.id,
        url: photo.blob_url,
        filename: photo.original_filename,
        uploadedAt: photo.uploaded_at,
        uploaderName: photo.uploader_name,
        uploaderProfileImage: photo.uploader_profile_image,
        title: photo.title || "",
        year: photo.year,
      }))

      return NextResponse.json({
        photos: formattedPhotos,
        filterTag,
        totalPhotos: photos.length,
      })
    } else {
      // Get all tags with photo counts
      const tags = await sql`
        SELECT t.id, t.name, COUNT(pt.photo_id) as photo_count
        FROM tags t
        LEFT JOIN photo_tags pt ON t.id = pt.tag_id
        GROUP BY t.id, t.name
        HAVING COUNT(pt.photo_id) > 0
        ORDER BY COUNT(pt.photo_id) DESC, t.name ASC
      `

      return NextResponse.json({
        tags: tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          photoCount: Number(tag.photo_count),
        })),
      })
    }
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json({
      tags: [],
      photos: [],
      error: "Failed to fetch tags",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
