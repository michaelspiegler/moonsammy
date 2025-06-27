import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 Admin user get: Starting for user ID:", params.id)

    if (!process.env.DATABASE_URL) {
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
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Verify admin access
    const sessions = await sql`
      SELECT u.id, u.name, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0 || sessions[0].role !== "Admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get user details including role
    const users = await sql`
      SELECT id, name, email, role, profile_image_url, created_at
      FROM users
      WHERE id = ${params.id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]
    console.log("🔍 Admin user get: Found user:", user.name, "with role:", user.role)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "Member", // Include role in response
      profileImage: user.profile_image_url,
      createdAt: user.created_at,
    })
  } catch (error) {
    console.error("🔍 Admin user get: Error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 Admin user update: Starting for user ID:", params.id)

    if (!process.env.DATABASE_URL) {
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
      console.log("🔍 Admin user update: No session ID found")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Verify admin access
    const sessions = await sql`
      SELECT u.id, u.name, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      console.log("🔍 Admin user update: Invalid or expired session")
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const adminUser = sessions[0]
    console.log("🔍 Admin user update: Admin user role:", adminUser.role)

    if (adminUser.role !== "Admin") {
      console.log("🔍 Admin user update: User is not admin")
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    console.log("🔍 Admin user update: Request body:", body)

    const { name, email, role } = body

    // Validate role if provided
    if (role && !["Admin", "Member"].includes(role)) {
      console.log("🔍 Admin user update: Invalid role:", role)
      return NextResponse.json({ error: "Invalid role. Must be 'Admin' or 'Member'" }, { status: 400 })
    }

    // Check if user exists
    const existingUsers = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${params.id}
    `

    if (existingUsers.length === 0) {
      console.log("🔍 Admin user update: User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const existingUser = existingUsers[0]
    console.log("🔍 Admin user update: Existing user:", existingUser.name, "current role:", existingUser.role)

    // Update user
    const updateResult = await sql`
      UPDATE users
      SET 
        name = ${name || existingUser.name},
        email = ${email || existingUser.email},
        role = ${role || existingUser.role}
      WHERE id = ${params.id}
    `

    console.log("🔍 Admin user update: Update result:", updateResult)

    // Verify the update by fetching the user again
    const updatedUsers = await sql`
      SELECT id, name, email, role, profile_image_url, created_at
      FROM users
      WHERE id = ${params.id}
    `

    if (updatedUsers.length === 0) {
      console.log("🔍 Admin user update: User not found after update")
      return NextResponse.json({ error: "User not found after update" }, { status: 404 })
    }

    const updatedUser = updatedUsers[0]
    console.log("🔍 Admin user update: Updated user:", updatedUser.name, "new role:", updatedUser.role)

    // Log the admin action
    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action, details, created_at)
        VALUES (${adminUser.id}, 'update_user', ${JSON.stringify({
          user_id: params.id,
          changes: { name, email, role },
          old_role: existingUser.role,
          new_role: updatedUser.role,
        })}, NOW())
      `
      console.log("🔍 Admin user update: Logged admin action")
    } catch (logError) {
      console.error("🔍 Admin user update: Failed to log action:", logError)
    }

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImage: updatedUser.profile_image_url,
      createdAt: updatedUser.created_at,
    })
  } catch (error) {
    console.error("🔍 Admin user update: Error:", error)
    return NextResponse.json(
      {
        error: "Failed to update user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 Admin user delete: Starting for user ID:", params.id)

    if (!process.env.DATABASE_URL) {
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
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Verify admin access
    const sessions = await sql`
      SELECT u.id, u.name, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0 || sessions[0].role !== "Admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const adminUser = sessions[0]

    // Check if user exists
    const users = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${params.id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userToDelete = users[0]

    // Prevent admin from deleting themselves
    if (adminUser.id === Number.parseInt(params.id)) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Delete user's related data first
    await sql`DELETE FROM user_sessions WHERE user_id = ${params.id}`
    await sql`DELETE FROM photo_likes WHERE user_id = ${params.id}`
    await sql`DELETE FROM photo_comments WHERE user_id = ${params.id}`
    await sql`DELETE FROM photo_tags WHERE photo_id IN (SELECT id FROM photo_uploads WHERE uploaded_by = ${params.id})`
    await sql`DELETE FROM photo_uploads WHERE uploaded_by = ${params.id}`

    // Delete the user
    await sql`DELETE FROM users WHERE id = ${params.id}`

    // Log the admin action
    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action, details, created_at)
        VALUES (${adminUser.id}, 'delete_user', ${JSON.stringify({
          deleted_user_id: params.id,
          deleted_user_name: userToDelete.name,
          deleted_user_email: userToDelete.email,
          deleted_user_role: userToDelete.role,
        })}, NOW())
      `
    } catch (logError) {
      console.error("🔍 Admin user delete: Failed to log action:", logError)
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("🔍 Admin user delete: Error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
