import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const photoId = params.id

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        title: "",
        year: null,
        tags: [],
        comments: [],
        likes: [],
        error: "Database not configured. Comments, likes, year, and tags require Neon database integration.",
      })
    }

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

    // Create indexes for better performance
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON comments(photo_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)`
      await sql`CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON likes(photo_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at)`
      await sql`CREATE INDEX IF NOT EXISTS idx_photo_tags_photo_id ON photo_tags(photo_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_photo_tags_tag_id ON photo_tags(tag_id)`
    } catch (indexError) {
      console.log("Indexes may already exist")
    }

    const [metadata, comments, likes, photoTags] = await Promise.all([
      sql`SELECT * FROM photo_metadata WHERE id = ${photoId}`,
      sql`SELECT * FROM comments WHERE photo_id = ${photoId} ORDER BY created_at ASC`,
      sql`SELECT * FROM likes WHERE photo_id = ${photoId} ORDER BY created_at ASC`,
      sql`
        SELECT t.id, t.name 
        FROM photo_tags pt 
        JOIN tags t ON pt.tag_id = t.id 
        WHERE pt.photo_id = ${photoId}
        ORDER BY t.name ASC
      `,
    ])

    return NextResponse.json({
      title: metadata[0]?.title || "",
      year: metadata[0]?.year || null,
      tags: photoTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        author: c.author,
        content: c.content,
        timestamp: c.created_at,
      })),
      likes: likes.map((l) => ({
        id: l.id,
        author: l.author,
        timestamp: l.created_at,
      })),
    })
  } catch (error) {
    console.error("Error fetching metadata:", error)
    return NextResponse.json({
      title: "",
      year: null,
      tags: [],
      comments: [],
      likes: [],
      error: "Failed to load metadata. Database may not be configured properly.",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const photoId = params.id
    const body = await request.json()

    console.log(`🏷️ Tag operation for photo: "${photoId}"`, body)

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database not configured. Please add Neon database integration to save metadata.",
        },
        { status: 500 },
      )
    }

    const sql = neon(process.env.DATABASE_URL)

    // Ensure tables exist
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

    // Enhanced photo ID finder with comprehensive debugging
    const findPhotoId = async (searchId: string) => {
      console.log(`🔍 === PHOTO ID SEARCH DEBUG ===`)
      console.log(`🔍 Original search ID: "${searchId}"`)
      console.log(`🔍 Search ID length: ${searchId.length}`)

      // Get all photos for debugging
      const allPhotos = await sql`SELECT id FROM photo_uploads ORDER BY created_at DESC LIMIT 20`
      console.log(`📋 Total photos in database: ${allPhotos.length}`)
      console.log(`📋 Available photo IDs:`)
      allPhotos.forEach((photo, index) => {
        console.log(`   ${index + 1}. "${photo.id}" (length: ${photo.id.length})`)
      })

      // Strategy 1: Exact match
      console.log(`🔍 Strategy 1: Exact match for "${searchId}"`)
      let photoExists = await sql`SELECT id FROM photo_uploads WHERE id = ${searchId}`
      if (photoExists.length > 0) {
        console.log(`✅ FOUND: Exact match "${photoExists[0].id}"`)
        return photoExists[0].id
      }
      console.log(`❌ No exact match found`)

      // Strategy 2: Remove URL encoding
      const decodedId = decodeURIComponent(searchId)
      if (decodedId !== searchId) {
        console.log(`🔍 Strategy 2: URL decoded "${decodedId}"`)
        photoExists = await sql`SELECT id FROM photo_uploads WHERE id = ${decodedId}`
        if (photoExists.length > 0) {
          console.log(`✅ FOUND: URL decoded match "${photoExists[0].id}"`)
          return photoExists[0].id
        }
        console.log(`❌ No URL decoded match found`)
      }

      // Strategy 3: Extract filename (remove timestamp prefix)
      const parts = searchId.split("-")
      console.log(`🔍 Strategy 3: Split by dash, parts:`, parts)

      if (parts.length >= 3) {
        // Remove first two parts (timestamp and counter)
        const filenameOnly = parts.slice(2).join("-")
        console.log(`🔍 Extracted filename: "${filenameOnly}"`)

        photoExists = await sql`SELECT id FROM photo_uploads WHERE id = ${filenameOnly}`
        if (photoExists.length > 0) {
          console.log(`✅ FOUND: Filename match "${photoExists[0].id}"`)
          return photoExists[0].id
        }
        console.log(`❌ No filename match found`)
      }

      // Strategy 4: Partial match (contains)
      console.log(`🔍 Strategy 4: Partial match`)
      const searchTerms = [
        searchId,
        decodedId,
        parts.length >= 3 ? parts.slice(2).join("-") : null,
        parts.length >= 2 ? parts.slice(1).join("-") : null,
      ].filter(Boolean)

      for (const term of searchTerms) {
        console.log(`🔍 Searching for photos containing: "${term}"`)
        photoExists = await sql`SELECT id FROM photo_uploads WHERE id LIKE ${`%${term}%`}`
        if (photoExists.length > 0) {
          console.log(`✅ FOUND: Partial match "${photoExists[0].id}"`)
          return photoExists[0].id
        }
      }

      // Strategy 5: Reverse search (check if any DB photo contains our search term)
      console.log(`🔍 Strategy 5: Reverse search`)
      for (const photo of allPhotos) {
        if (photo.id.includes(searchId) || searchId.includes(photo.id)) {
          console.log(`✅ FOUND: Reverse match "${photo.id}"`)
          return photo.id
        }
      }

      console.log(`❌ === NO PHOTO FOUND WITH ANY STRATEGY ===`)
      return null
    }

    if (body.action === "setTitle") {
      try {
        await sql`
          INSERT INTO photo_metadata (id, title) 
          VALUES (${photoId}, ${body.title})
          ON CONFLICT (id) DO UPDATE SET title = ${body.title}
        `
      } catch (upsertError) {
        console.error("Title update failed:", upsertError)
        return NextResponse.json({ error: "Failed to save title" }, { status: 500 })
      }
      return NextResponse.json({ success: true, title: body.title })
    }

    if (body.action === "setYear") {
      try {
        await sql`
          INSERT INTO photo_metadata (id, year) 
          VALUES (${photoId}, ${body.year})
          ON CONFLICT (id) DO UPDATE SET year = ${body.year}
        `
      } catch (upsertError) {
        console.error("Year update failed:", upsertError)
        return NextResponse.json({ error: "Failed to save year" }, { status: 500 })
      }
      return NextResponse.json({ success: true, year: body.year })
    }

    if (body.action === "addTag") {
      const tagName = body.tagName.trim().toLowerCase()
      const tagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        console.log(`🏷️ Adding tag "${tagName}" to photo "${photoId}"`)

        // Find the correct photo ID with comprehensive debugging
        const actualPhotoId = await findPhotoId(photoId)
        if (!actualPhotoId) {
          console.error(`❌ Photo "${photoId}" not found in photo_uploads table after all strategies`)
          return NextResponse.json(
            {
              error: "Photo not found in database. Please check the photo ID format.",
              searchedId: photoId,
              availablePhotos: (await sql`SELECT id FROM photo_uploads LIMIT 5`).map((p) => p.id),
            },
            { status: 404 },
          )
        }

        console.log(`✅ Using actual photo ID: "${actualPhotoId}"`)

        // Insert tag if it doesn't exist
        await sql`
          INSERT INTO tags (id, name) 
          VALUES (${tagId}, ${tagName})
          ON CONFLICT (name) DO NOTHING
        `

        // Get the tag ID (either newly created or existing)
        const existingTag = await sql`SELECT id FROM tags WHERE name = ${tagName}`
        const finalTagId = existingTag[0]?.id || tagId

        console.log(`🏷️ Using tag ID: ${finalTagId} for tag: ${tagName}`)

        // Link photo to tag using the actual photo ID
        const photoTagId = `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await sql`
          INSERT INTO photo_tags (id, photo_id, tag_id) 
          VALUES (${photoTagId}, ${actualPhotoId}, ${finalTagId})
          ON CONFLICT (photo_id, tag_id) DO NOTHING
        `

        console.log(`✅ Successfully linked photo "${actualPhotoId}" to tag "${finalTagId}"`)

        return NextResponse.json({
          success: true,
          tag: { id: finalTagId, name: tagName },
          actualPhotoId: actualPhotoId,
        })
      } catch (error) {
        console.error("Tag add failed:", error)
        return NextResponse.json({ error: "Failed to add tag", details: error.message }, { status: 500 })
      }
    }

    if (body.action === "removeTag") {
      try {
        // Find the correct photo ID for removal too
        const actualPhotoId = await findPhotoId(photoId)
        if (!actualPhotoId) {
          console.error(`❌ Photo ${photoId} not found for tag removal`)
          return NextResponse.json({ error: "Photo not found" }, { status: 404 })
        }

        await sql`
          DELETE FROM photo_tags 
          WHERE photo_id = ${actualPhotoId} AND tag_id = ${body.tagId}
        `
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error("Tag remove failed:", error)
        return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 })
      }
    }

    if (body.action === "addComment") {
      const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await sql`
        INSERT INTO comments (id, photo_id, author, content, created_at)
        VALUES (${commentId}, ${photoId}, ${body.author}, ${body.content}, NOW())
      `

      const newComments = await sql`
        SELECT * FROM comments 
        WHERE id = ${commentId}
      `

      const newComment = {
        id: newComments[0].id,
        author: newComments[0].author,
        content: newComments[0].content,
        timestamp: newComments[0].created_at,
      }

      return NextResponse.json({ success: true, comment: newComment })
    }

    if (body.action === "addLike") {
      const likeId = `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        await sql`
          INSERT INTO likes (id, photo_id, author, created_at)
          VALUES (${likeId}, ${photoId}, ${body.author}, NOW())
        `

        const newLikes = await sql`
          SELECT * FROM likes 
          WHERE id = ${likeId}
        `

        const newLike = {
          id: newLikes[0].id,
          author: newLikes[0].author,
          timestamp: newLikes[0].created_at,
        }

        return NextResponse.json({ success: true, like: newLike })
      } catch (error) {
        // Handle duplicate like (user already liked this photo)
        if (error instanceof Error && error.message.includes("UNIQUE")) {
          return NextResponse.json({ error: "You already loved this photo" }, { status: 400 })
        }
        throw error
      }
    }

    if (body.action === "removeLike") {
      await sql`DELETE FROM likes WHERE id = ${body.likeId}`
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating metadata:", error)
    return NextResponse.json(
      {
        error: "Failed to save. Please ensure Neon database is properly configured.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
