import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

async function getCurrentUser(request: NextRequest) {
  console.log("🔍 Sync API: Getting current user...")

  if (!process.env.DATABASE_URL) {
    console.log("🔍 Sync API: No database URL")
    return null
  }

  // Try multiple ways to get session ID
  const sessionFromCookie = request.cookies.get("session")?.value
  const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
  const sessionFromHeader = request.headers.get("x-session-token")

  const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromHeader

  if (!sessionId) {
    console.log("🔍 Sync API: No session found")
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
      console.log("🔍 Sync API: Session not found in database")
      return null
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (expiresAt <= now) {
      console.log("🔍 Sync API: Session expired")
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return null
    }

    return session
  } catch (error) {
    console.error("🔍 Sync API: Database error:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    console.log("🔄 Syncing profile image for user uploads...")

    // Update all photo uploads by this user with their current profile image
    const updateResult = await sql`
      UPDATE photo_uploads 
      SET uploader_profile_image = ${user.profile_image_url}
      WHERE user_id = ${user.id}
    `

    // Get count of updated uploads
    const uploadCount = await sql`
      SELECT COUNT(*) as count 
      FROM photo_uploads 
      WHERE user_id = ${user.id}
    `

    const count = uploadCount[0]?.count || 0

    console.log("✅ Synced profile image for", count, "uploads")

    return NextResponse.json({
      success: true,
      message: `Updated profile image for ${count} uploaded photos`,
      updatedCount: count,
    })
  } catch (error) {
    console.error("Profile sync error:", error)
    return NextResponse.json({ error: "Failed to sync profile image" }, { status: 500 })
  }
}
