import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

async function getAdminUser(sessionToken: string) {
  if (!process.env.DATABASE_URL) return null

  const sql = neon(process.env.DATABASE_URL)

  const sessions = await sql`
    SELECT s.*, u.name, u.email, u.role
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ${sessionToken}
    AND s.expires_at > NOW()
    AND u.role = 'Admin'
  `

  return sessions.length > 0 ? sessions[0] : null
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const photoId = params.id
    console.log(`🗑️ Admin attempting to delete photo: ${photoId}`)

    // Check admin authentication
    const sessionToken = request.cookies.get("session_token")?.value
    if (!sessionToken) {
      console.log("🗑️ No session token provided")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminUser = await getAdminUser(sessionToken)
    if (!adminUser) {
      console.log("🗑️ User is not an admin")
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log(`🗑️ Admin ${adminUser.email} authorized for deletion`)

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if photo exists
    const existingPhotos = await sql`
      SELECT id, image_url FROM photo_uploads WHERE id = ${photoId}
    `

    if (existingPhotos.length === 0) {
      console.log(`🗑️ Photo ${photoId} not found in database`)
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    console.log(`🗑️ Found photo ${photoId}, proceeding with deletion`)

    // Delete in correct order to handle foreign key constraints
    console.log(`🗑️ Deleting photo tags for ${photoId}`)
    await sql`DELETE FROM photo_tags WHERE photo_id = ${photoId}`

    console.log(`🗑️ Deleting comments for ${photoId}`)
    await sql`DELETE FROM comments WHERE photo_id = ${photoId}`

    console.log(`🗑️ Deleting likes for ${photoId}`)
    await sql`DELETE FROM likes WHERE photo_id = ${photoId}`

    console.log(`🗑️ Deleting metadata for ${photoId}`)
    await sql`DELETE FROM photo_metadata WHERE id = ${photoId}`

    console.log(`🗑️ Deleting photo record for ${photoId}`)
    const deletedPhotos = await sql`
      DELETE FROM photo_uploads 
      WHERE id = ${photoId}
      RETURNING id
    `

    if (deletedPhotos.length === 0) {
      console.log(`🗑️ Failed to delete photo ${photoId}`)
      return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
    }

    // Log the admin action
    try {
      await sql`
        INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
        VALUES (
          ${`log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`},
          ${adminUser.user_id},
          'DELETE_PHOTO',
          'photo',
          ${photoId},
          ${'{"reason": "Admin deletion"}'},
          NOW()
        )
      `
    } catch (logError) {
      console.log("🗑️ Failed to log admin action:", logError)
    }

    console.log(`✅ Successfully deleted photo ${photoId}`)
    return NextResponse.json({ success: true, message: "Photo deleted successfully" })
  } catch (error) {
    console.error("🗑️ Error deleting photo:", error)
    return NextResponse.json({ error: "Failed to delete photo", details: error.message }, { status: 500 })
  }
}
