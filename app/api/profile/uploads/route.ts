import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

async function getCurrentUser(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return null
  }

  const sessionFromCookie = request.cookies.get("session")?.value
  const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
  const sessionFromHeader = request.headers.get("x-session-token")

  const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromHeader

  if (!sessionId) {
    return null
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const sessions = await sql`
      SELECT u.id, u.name, u.email, u.profile_image_url, s.expires_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    if (sessions.length === 0) {
      return null
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (expiresAt <= now) {
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return null
    }

    return session
  } catch (error) {
    console.error("Database error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get all uploads by this user with metadata
    const uploads = await sql`
      SELECT 
        pu.id,
        pu.original_filename,
        pu.blob_url,
        pu.uploaded_at,
        pm.title,
        (SELECT COUNT(*) FROM comments WHERE photo_id = pu.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE photo_id = pu.id) as like_count
      FROM photo_uploads pu
      LEFT JOIN photo_metadata pm ON pu.id = pm.id
      WHERE pu.user_id = ${user.id}
      ORDER BY pu.uploaded_at DESC
    `

    const formattedUploads = uploads.map((upload) => ({
      id: upload.id,
      url: upload.blob_url,
      filename: upload.original_filename,
      title: upload.title || "",
      uploadedAt: upload.uploaded_at,
      commentCount: Number(upload.comment_count) || 0,
      likeCount: Number(upload.like_count) || 0,
    }))

    return NextResponse.json({
      uploads: formattedUploads,
      totalUploads: uploads.length,
    })
  } catch (error) {
    console.error("Error fetching user uploads:", error)
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 })
  }
}
