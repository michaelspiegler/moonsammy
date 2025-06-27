import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== Admin Photo DELETE Request ===")
    console.log("Photo ID:", params.id)

    // Get session from cookies
    const sessionCookie =
      request.cookies.get("session")?.value ||
      request.cookies.get("auth-session")?.value ||
      request.cookies.get("user-session")?.value

    console.log("Session cookie found:", !!sessionCookie)

    if (!sessionCookie) {
      console.log("No session cookie found")
      return NextResponse.json({ error: "No session found" }, { status: 401 })
    }

    // Verify admin session
    const sessionResult = await sql`
      SELECT us.*, u.role, u.name, u.email
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ${sessionCookie}
        AND us.expires_at > NOW()
        AND u.role = 'Admin'
    `

    console.log("Session query result:", sessionResult.length > 0 ? "Valid admin session" : "Invalid session")

    if (sessionResult.length === 0) {
      console.log("Invalid admin session or user not admin")
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const adminUser = sessionResult[0]
    console.log("Admin user:", adminUser.name, adminUser.email)

    // Get photo details before deletion
    const photoResult = await sql`
      SELECT id, filename, blob_url, user_id, title
      FROM photo_uploads
      WHERE id = ${params.id}
    `

    if (photoResult.length === 0) {
      console.log("Photo not found")
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const photo = photoResult[0]
    console.log("Photo to delete:", photo.filename)

    // Delete related data first (foreign key constraints)
    await sql`DELETE FROM likes WHERE photo_id = ${params.id}`
    await sql`DELETE FROM comments WHERE photo_id = ${params.id}`
    await sql`DELETE FROM photo_tags WHERE photo_id = ${params.id}`

    // Delete the photo
    await sql`DELETE FROM photo_uploads WHERE id = ${params.id}`

    console.log("Photo deleted successfully")

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'DELETE_PHOTO',
        ${JSON.stringify({
          photoId: params.id,
          filename: photo.filename,
          title: photo.title,
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    })
  } catch (error) {
    console.error("Admin photo DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== Admin Photo PUT Request ===")
    console.log("Photo ID:", params.id)

    // Get session from cookies
    const sessionCookie =
      request.cookies.get("session")?.value ||
      request.cookies.get("auth-session")?.value ||
      request.cookies.get("user-session")?.value

    console.log("Session cookie found:", !!sessionCookie)

    if (!sessionCookie) {
      console.log("No session cookie found")
      return NextResponse.json({ error: "No session found" }, { status: 401 })
    }

    // Verify admin session
    const sessionResult = await sql`
      SELECT us.*, u.role, u.name, u.email
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ${sessionCookie}
        AND us.expires_at > NOW()
        AND u.role = 'Admin'
    `

    console.log("Session query result:", sessionResult.length > 0 ? "Valid admin session" : "Invalid session")

    if (sessionResult.length === 0) {
      console.log("Invalid admin session or user not admin")
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const adminUser = sessionResult[0]
    console.log("Admin user:", adminUser.name, adminUser.email)

    const { title, year } = await request.json()
    console.log("Update data:", { title, year })

    // Update the photo
    const updateResult = await sql`
      UPDATE photo_uploads
      SET 
        title = ${title || null},
        year = ${year || null}
      WHERE id = ${params.id}
      RETURNING *
    `

    if (updateResult.length === 0) {
      console.log("Photo not found")
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const updatedPhoto = updateResult[0]
    console.log("Photo updated successfully")

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'UPDATE_PHOTO',
        ${JSON.stringify({
          photoId: params.id,
          changes: { title, year },
          filename: updatedPhoto.filename,
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      photo: updatedPhoto,
      message: "Photo updated successfully",
    })
  } catch (error) {
    console.error("Admin photo PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
