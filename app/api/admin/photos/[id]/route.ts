import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { del } from "@vercel/blob"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("🗑️ Admin delete photo: Starting deletion for photo:", params.id)

    // Check authentication
    const sessionId = request.headers.get("cookie")?.match(/session=([^;]+)/)?.[1]

    if (!sessionId) {
      console.log("🗑️ Admin delete photo: No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      console.log("🗑️ Admin delete photo: No database URL")
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Verify admin session
    const sessions = await sql`
      SELECT s.*, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0 || sessions[0].role !== "Admin") {
      console.log("🗑️ Admin delete photo: Invalid admin session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🗑️ Admin delete photo: Admin verified, proceeding with deletion")

    // Delete from database first (to handle foreign key constraints)
    try {
      // Delete in order: likes, comments, photo_tags, photo_metadata, photo_uploads
      await sql`DELETE FROM likes WHERE photo_id = ${params.id}`
      console.log("🗑️ Admin delete photo: Deleted likes")

      await sql`DELETE FROM comments WHERE photo_id = ${params.id}`
      console.log("🗑️ Admin delete photo: Deleted comments")

      await sql`DELETE FROM photo_tags WHERE photo_id = ${params.id}`
      console.log("🗑️ Admin delete photo: Deleted photo tags")

      await sql`DELETE FROM photo_metadata WHERE id = ${params.id}`
      console.log("🗑️ Admin delete photo: Deleted metadata")

      await sql`DELETE FROM photo_uploads WHERE id = ${params.id}`
      console.log("🗑️ Admin delete photo: Deleted upload record")
    } catch (dbError) {
      console.error("🗑️ Admin delete photo: Database deletion error:", dbError)
      // Continue with blob deletion even if database cleanup fails
    }

    // Delete from Vercel Blob
    try {
      await del(params.id)
      console.log("🗑️ Admin delete photo: Deleted from blob storage")
    } catch (blobError) {
      console.error("🗑️ Admin delete photo: Blob deletion error:", blobError)
      // Photo might already be deleted from blob or doesn't exist
    }

    // Log admin activity
    try {
      const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await sql`
        INSERT INTO admin_logs (id, admin_id, action, details, created_at)
        VALUES (${activityId}, ${sessions[0].user_id}, 'delete_photo', ${JSON.stringify({ photoId: params.id })}, NOW())
      `
      console.log("🗑️ Admin delete photo: Logged admin activity")
    } catch (logError) {
      console.error("🗑️ Admin delete photo: Failed to log activity:", logError)
    }

    console.log("🗑️ Admin delete photo: Deletion completed successfully")
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("🗑️ Admin delete photo: Unexpected error:", error)
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
  }
}
