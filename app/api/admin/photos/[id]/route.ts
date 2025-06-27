import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { del } from "@vercel/blob"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("🗑️ Admin photo delete: Starting deletion for photo ID:", params.id)

    // Check authentication
    const cookies = request.headers.get("cookie")
    if (!cookies) {
      console.log("🗑️ Admin photo delete: No cookies found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionMatch = cookies.match(/session=([^;]+)/)
    if (!sessionMatch) {
      console.log("🗑️ Admin photo delete: No session cookie found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionId = sessionMatch[1]
    console.log("🗑️ Admin photo delete: Session ID:", sessionId.substring(0, 8) + "...")

    if (!process.env.DATABASE_URL) {
      console.log("🗑️ Admin photo delete: No database URL")
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Verify admin access
    const adminCheck = await sql`
      SELECT u.role, u.name
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW() AND u.role = 'Admin'
    `

    console.log("🗑️ Admin photo delete: Admin check result:", adminCheck.length > 0 ? "authorized" : "unauthorized")

    if (adminCheck.length === 0) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log("🗑️ Admin photo delete: Admin user:", adminCheck[0].name)

    // Check if photo exists in database
    const photoCheck = await sql`
      SELECT id, blob_url FROM photo_uploads WHERE id = ${params.id}
    `

    console.log("🗑️ Admin photo delete: Photo check result:", photoCheck.length > 0 ? "found" : "not found")

    if (photoCheck.length === 0) {
      console.log("🗑️ Admin photo delete: Photo not found in database")
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const photo = photoCheck[0]
    console.log("🗑️ Admin photo delete: Found photo with blob URL:", photo.blob_url ? "present" : "missing")

    // Delete related data in correct order (foreign key constraints)
    console.log("🗑️ Admin photo delete: Deleting photo tags...")
    await sql`DELETE FROM photo_tags WHERE photo_id = ${params.id}`

    console.log("🗑️ Admin photo delete: Deleting comments...")
    await sql`DELETE FROM comments WHERE photo_id = ${params.id}`

    console.log("🗑️ Admin photo delete: Deleting likes...")
    await sql`DELETE FROM likes WHERE photo_id = ${params.id}`

    console.log("🗑️ Admin photo delete: Deleting metadata...")
    await sql`DELETE FROM photo_metadata WHERE id = ${params.id}`

    console.log("🗑️ Admin photo delete: Deleting upload record...")
    await sql`DELETE FROM photo_uploads WHERE id = ${params.id}`

    // Delete from Vercel Blob if URL exists
    if (photo.blob_url) {
      try {
        console.log("🗑️ Admin photo delete: Deleting from Vercel Blob...")
        await del(photo.blob_url)
        console.log("🗑️ Admin photo delete: Successfully deleted from Vercel Blob")
      } catch (blobError) {
        console.error("🗑️ Admin photo delete: Error deleting from Vercel Blob:", blobError)
        // Continue even if blob deletion fails
      }
    }

    // Log the deletion
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, created_at)
      VALUES (
        (SELECT user_id FROM user_sessions WHERE id = ${sessionId}),
        'delete_photo',
        ${JSON.stringify({ photoId: params.id, blobUrl: photo.blob_url })},
        NOW()
      )
    `

    console.log("🗑️ Admin photo delete: Deletion completed successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("🗑️ Admin photo delete: Error:", error)
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
  }
}
