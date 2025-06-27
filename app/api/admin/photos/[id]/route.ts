import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 Admin photo delete: Starting deletion for photo ID:", params.id)

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Admin photo delete: No database URL")
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    // Get session from multiple sources
    const cookieStore = request.cookies
    const sessionFromCookie = cookieStore.get("session")?.value
    const sessionFromAuthCookie = cookieStore.get("auth-session")?.value
    const sessionFromUserCookie = cookieStore.get("user-session")?.value
    const sessionFromHeader = request.headers.get("x-session-token")

    const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromUserCookie || sessionFromHeader

    if (!sessionId) {
      console.log("🔍 Admin photo delete: No session ID found")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log("🔍 Admin photo delete: Using session ID:", sessionId.substring(0, 20) + "...")

    const sql = neon(process.env.DATABASE_URL)

    // Verify admin access
    const sessions = await sql`
      SELECT u.id, u.name, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      console.log("🔍 Admin photo delete: Invalid or expired session")
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const user = sessions[0]
    console.log("🔍 Admin photo delete: User role:", user.role)

    if (user.role !== "Admin") {
      console.log("🔍 Admin photo delete: User is not admin")
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Check if photo exists
    const photos = await sql`
      SELECT id, image_url, uploaded_by
      FROM photo_uploads
      WHERE id = ${params.id}
    `

    console.log("🔍 Admin photo delete: Found photos:", photos.length)

    if (photos.length === 0) {
      console.log("🔍 Admin photo delete: Photo not found")
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const photo = photos[0]
    console.log("🔍 Admin photo delete: Photo details:", {
      id: photo.id,
      uploaded_by: photo.uploaded_by,
      image_url: photo.image_url ? "exists" : "missing",
    })

    // Delete related data first (foreign key constraints)
    console.log("🔍 Admin photo delete: Deleting photo tags...")
    await sql`DELETE FROM photo_tags WHERE photo_id = ${params.id}`

    console.log("🔍 Admin photo delete: Deleting photo comments...")
    await sql`DELETE FROM photo_comments WHERE photo_id = ${params.id}`

    console.log("🔍 Admin photo delete: Deleting photo likes...")
    await sql`DELETE FROM photo_likes WHERE photo_id = ${params.id}`

    // Delete the photo record
    console.log("🔍 Admin photo delete: Deleting photo record...")
    const deleteResult = await sql`
      DELETE FROM photo_uploads 
      WHERE id = ${params.id}
    `

    console.log("🔍 Admin photo delete: Delete result:", deleteResult)

    // Log the admin action
    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action, details, created_at)
        VALUES (${user.id}, 'delete_photo', ${JSON.stringify({
          photo_id: params.id,
          photo_url: photo.image_url,
          uploaded_by: photo.uploaded_by,
        })}, NOW())
      `
      console.log("🔍 Admin photo delete: Logged admin action")
    } catch (logError) {
      console.error("🔍 Admin photo delete: Failed to log action:", logError)
    }

    console.log("🔍 Admin photo delete: Successfully deleted photo")
    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    })
  } catch (error) {
    console.error("🔍 Admin photo delete: Error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete photo",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
