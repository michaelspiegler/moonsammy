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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    // Check admin authentication
    const sessionToken = request.cookies.get("session_token")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminUser = await getAdminUser(sessionToken)
    if (!adminUser) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    const users = await sql`
      SELECT id, name, email, role, created_at, profile_image
      FROM users 
      WHERE id = ${userId}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: users[0] })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
    const body = await request.json()

    console.log(`👤 Admin updating user ${userId}:`, body)

    // Check admin authentication
    const sessionToken = request.cookies.get("session_token")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminUser = await getAdminUser(sessionToken)
    if (!adminUser) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log(`👤 Admin ${adminUser.email} authorized for user update`)

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Validate role if provided
    if (body.role && !["Admin", "Member"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role. Must be 'Admin' or 'Member'" }, { status: 400 })
    }

    // Build update query dynamically
    const updates = []
    const values = []

    if (body.name !== undefined) {
      updates.push(`name = $${updates.length + 1}`)
      values.push(body.name)
    }

    if (body.email !== undefined) {
      updates.push(`email = $${updates.length + 1}`)
      values.push(body.email)
    }

    if (body.role !== undefined) {
      updates.push(`role = $${updates.length + 1}`)
      values.push(body.role)
      console.log(`👤 Setting role to: ${body.role}`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Add userId to values
    values.push(userId)

    // Execute update
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(", ")} 
      WHERE id = $${values.length}
      RETURNING id, name, email, role, created_at, profile_image
    `

    console.log(`👤 Executing query: ${updateQuery}`)
    console.log(`👤 With values:`, values)

    const updatedUsers = await sql.unsafe(updateQuery, values)

    if (updatedUsers.length === 0) {
      return NextResponse.json({ error: "User not found or update failed" }, { status: 404 })
    }

    const updatedUser = updatedUsers[0]
    console.log(`👤 User updated successfully:`, updatedUser)

    // Verify the update by fetching the user again
    const verifyUsers = await sql`
      SELECT id, name, email, role, created_at, profile_image
      FROM users 
      WHERE id = ${userId}
    `

    console.log(`👤 Verification fetch:`, verifyUsers[0])

    // Log the admin action
    try {
      await sql`
        INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
        VALUES (
          ${`log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`},
          ${adminUser.user_id},
          'UPDATE_USER',
          'user',
          ${userId},
          ${JSON.stringify({ changes: body })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("👤 Failed to log admin action:", logError)
    }

    return NextResponse.json({
      user: updatedUser,
      message: "User updated successfully",
    })
  } catch (error) {
    console.error("👤 Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    // Check admin authentication
    const sessionToken = request.cookies.get("session_token")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminUser = await getAdminUser(sessionToken)
    if (!adminUser) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Don't allow admin to delete themselves
    if (userId === adminUser.user_id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Delete user and related data
    await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`
    await sql`DELETE FROM photo_uploads WHERE user_id = ${userId}`

    const deletedUsers = await sql`
      DELETE FROM users 
      WHERE id = ${userId}
      RETURNING id, name, email
    `

    if (deletedUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Log the admin action
    try {
      await sql`
        INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
        VALUES (
          ${`log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`},
          ${adminUser.user_id},
          'DELETE_USER',
          'user',
          ${userId},
          ${JSON.stringify({ deletedUser: deletedUsers[0] })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log admin action:", logError)
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
      deletedUser: deletedUsers[0],
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user", details: error.message }, { status: 500 })
  }
}
