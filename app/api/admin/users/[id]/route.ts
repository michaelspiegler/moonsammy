import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== Admin User PUT Request ===")
    console.log("User ID:", params.id)

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

    const { name, email, role } = await request.json()
    console.log("Update data:", { name, email, role })

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Check if email is already taken by another user
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()} AND id != ${params.id}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Email is already taken by another user" }, { status: 400 })
    }

    // Update user
    const updatedUser = await sql`
      UPDATE users
      SET 
        name = ${name},
        email = ${email.toLowerCase()},
        role = ${role || "Member"},
        updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING id, name, email, role, created_at, updated_at
    `

    if (updatedUser.length === 0) {
      console.log("User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("User updated successfully")

    // Get user stats
    const userStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM photo_uploads WHERE user_id = ${params.id}) as upload_count,
        (SELECT COUNT(*) FROM comments WHERE author = ${name}) as comment_count
    `

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'UPDATE_USER',
        ${JSON.stringify({
          userId: params.id,
          changes: { name, email, role },
          previousData: {
            /* would need to fetch before update */
          },
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser[0].id,
        name: updatedUser[0].name,
        email: updatedUser[0].email,
        role: updatedUser[0].role,
        createdAt: updatedUser[0].created_at,
        updatedAt: updatedUser[0].updated_at,
        uploadCount: Number.parseInt(userStats[0].upload_count),
        commentCount: Number.parseInt(userStats[0].comment_count),
      },
      message: "User updated successfully",
    })
  } catch (error) {
    console.error("Admin user PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== Admin User DELETE Request ===")
    console.log("User ID:", params.id)

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

    const { keepPhotos } = await request.json()
    console.log("Keep photos:", keepPhotos)

    // Get user details before deletion
    const userToDelete = await sql`
      SELECT id, name, email, role FROM users WHERE id = ${params.id}
    `

    if (userToDelete.length === 0) {
      console.log("User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userToDelete[0]
    console.log("User to delete:", user.name, user.email)

    // Prevent deleting the last admin
    if (user.role === "Admin") {
      const adminCount = await sql`
        SELECT COUNT(*) as count FROM users WHERE role = 'Admin'
      `
      if (Number.parseInt(adminCount[0].count) <= 1) {
        return NextResponse.json({ error: "Cannot delete the last admin user" }, { status: 400 })
      }
    }

    // Handle photos based on keepPhotos flag
    if (keepPhotos) {
      // Update photos to remove user association but keep the photos
      await sql`
        UPDATE photo_uploads 
        SET user_id = NULL, uploader_name = 'Anonymous User'
        WHERE user_id = ${params.id}
      `
      console.log("Photos updated to anonymous")
    } else {
      // Delete all user's photos and related data
      const userPhotos = await sql`
        SELECT id FROM photo_uploads WHERE user_id = ${params.id}
      `
      const photoIds = userPhotos.map((p) => p.id)

      if (photoIds.length > 0) {
        await sql`DELETE FROM likes WHERE photo_id = ANY(${photoIds})`
        await sql`DELETE FROM comments WHERE photo_id = ANY(${photoIds})`
        await sql`DELETE FROM photo_tags WHERE photo_id = ANY(${photoIds})`
        await sql`DELETE FROM photo_uploads WHERE user_id = ${params.id}`
        console.log("User photos deleted:", photoIds.length)
      }
    }

    // Delete user's comments (but keep the comments, just remove author association)
    await sql`
      UPDATE comments 
      SET author = 'Deleted User'
      WHERE author = ${user.name}
    `

    // Delete user's likes
    await sql`
      DELETE FROM likes WHERE author = ${user.name}
    `

    // Delete user sessions
    await sql`
      DELETE FROM user_sessions WHERE user_id = ${params.id}
    `

    // Delete the user
    await sql`
      DELETE FROM users WHERE id = ${params.id}
    `

    console.log("User deleted successfully")

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'DELETE_USER',
        ${JSON.stringify({
          deletedUserId: params.id,
          deletedUserName: user.name,
          deletedUserEmail: user.email,
          keepPhotos,
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: `User ${user.name} deleted successfully`,
    })
  } catch (error) {
    console.error("Admin user DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
