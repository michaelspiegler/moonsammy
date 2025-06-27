import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const photoId = params.id
    console.log(`📊 Fetching metadata for photo: ${photoId}`)

    if (!process.env.DATABASE_URL) {
      console.log("📸 Photo metadata: No database URL")
      return NextResponse.json(
        {
          likes: 0,
          comments: [],
          hasLiked: false,
        },
        { status: 200 },
      )
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get session for like status
    const sessionId = request.headers.get("cookie")?.match(/session=([^;]+)/)?.[1]
    let currentUserId = null

    if (sessionId) {
      try {
        const sessions = await sql`
          SELECT user_id FROM user_sessions 
          WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length > 0) {
          currentUserId = sessions[0].user_id
        }
      } catch (error) {
        console.log("📸 Photo metadata: Session check failed:", error)
      }
    }

    // Fetch metadata with error handling
    const [likesResult, commentsResult, hasLikedResult] = await Promise.allSettled([
      sql`SELECT COUNT(*) as count FROM likes WHERE photo_id = ${photoId}`.catch(() => [{ count: 0 }]),
      sql`SELECT * FROM comments WHERE photo_id = ${photoId} ORDER BY created_at ASC`.catch(() => []),
      currentUserId
        ? sql`SELECT COUNT(*) as count FROM likes WHERE photo_id = ${photoId} AND author = ${currentUserId}`.catch(
            () => [{ count: 0 }],
          )
        : Promise.resolve([{ count: 0 }]),
    ])

    const likes = likesResult.status === "fulfilled" ? likesResult.value[0]?.count || 0 : 0
    const comments = commentsResult.status === "fulfilled" ? commentsResult.value : []
    const hasLiked = hasLikedResult.status === "fulfilled" ? hasLikedResult.value[0]?.count > 0 : false

    console.log("📸 Photo metadata: Success - likes:", likes, "comments:", comments.length)

    return NextResponse.json(
      {
        likes: Number(likes),
        comments: comments.map((c) => ({
          id: c.id,
          author: c.author,
          content: c.content,
          created_at: c.created_at,
        })),
        hasLiked,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("📸 Photo metadata: Error:", error)
    return NextResponse.json(
      {
        likes: 0,
        comments: [],
        hasLiked: false,
      },
      { status: 200 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const photoId = params.id
    const body = await request.json()

    console.log(`🏷️ Tag operation for photo: "${photoId}"`, body)

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Ensure tables exist
    try {
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
    } catch (tableError) {
      console.log("🏷️ Tables may already exist")
    }

    if (body.action === "setTitle") {
      await sql`
        INSERT INTO photo_metadata (id, title) 
        VALUES (${photoId}, ${body.title})
        ON CONFLICT (id) DO UPDATE SET title = ${body.title}
      `
      return NextResponse.json({ success: true, title: body.title })
    }

    if (body.action === "setYear") {
      await sql`
        INSERT INTO photo_metadata (id, year) 
        VALUES (${photoId}, ${body.year})
        ON CONFLICT (id) DO UPDATE SET year = ${body.year}
      `
      return NextResponse.json({ success: true, year: body.year })
    }

    if (body.action === "addTag") {
      const tagName = body.tagName.trim().toLowerCase()
      const tagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Insert tag if it doesn't exist
      await sql`
        INSERT INTO tags (id, name) 
        VALUES (${tagId}, ${tagName})
        ON CONFLICT (name) DO NOTHING
      `

      // Get the tag ID
      const existingTag = await sql`SELECT id FROM tags WHERE name = ${tagName}`
      const finalTagId = existingTag[0]?.id || tagId

      // Link photo to tag
      const photoTagId = `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        await sql`
          INSERT INTO photo_tags (id, photo_id, tag_id, created_at) 
          VALUES (${photoTagId}, ${photoId}, ${finalTagId}, NOW())
        `
      } catch (error) {
        if (error.message.includes("UNIQUE")) {
          return NextResponse.json({
            success: true,
            tag: { id: finalTagId, name: tagName },
            message: "Tag already exists for this photo",
          })
        }
        throw error
      }

      return NextResponse.json({
        success: true,
        tag: { id: finalTagId, name: tagName },
      })
    }

    if (body.action === "removeTag") {
      await sql`
        DELETE FROM photo_tags 
        WHERE photo_id = ${photoId} AND tag_id = ${body.tagId}
      `
      return NextResponse.json({ success: true })
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
        if (error.message.includes("UNIQUE")) {
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
    console.error("🏷️ Error updating metadata:", error)
    return NextResponse.json({ error: "Failed to save metadata" }, { status: 500 })
  }
}
