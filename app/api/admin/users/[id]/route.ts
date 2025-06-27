import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("👤 Admin user get: Fetching user ID:", params.id)

    // Check authentication
    const cookies = request.headers.get("cookie")
    if (!cookies) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionMatch = cookies.match(/session=([^;]+)/)
    if (!sessionMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionId = sessionMatch[1]
    const sql = neon(process.env.DATABASE_URL!)

    // Verify admin access
    const adminCheck = await sql`
      SELECT u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW() AND u.role = 'Admin'
    `

    if (adminCheck.length === 0) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get user data including role
    const users = await sql`
      SELECT id, name, email, role, profile_image, created_at
      FROM users 
      WHERE id = ${params.id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]
    console.log("👤 Admin user get: Found user:", user.name, "Role:", user.role)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // Make sure role is included
      profileImage: user.profile_image,
      createdAt: user.created_at,
    })
  } catch (error) {
    console.error("👤 Admin user get: Error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("👤 Admin user update: Starting update for user ID:", params.id)

    const body = await request.json()
    console.log("👤 Admin user update: Update data:", body)

    // Check authentication
    const cookies = request.headers.get("cookie")
    if (!cookies) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionMatch = cookies.match(/session=([^;]+)/)
    if (!sessionMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionId = sessionMatch[1]
    const sql = neon(process.env.DATABASE_URL!)

    // Verify admin access
    const adminCheck = await sql`
      SELECT u.role, u.name
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW() AND u.role = 'Admin'
    `

    if (adminCheck.length === 0) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log("👤 Admin user update: Admin user:", adminCheck[0].name)

    // Validate role if provided
    if (body.role && !["Admin", "Member"].includes(body.role)) {
      console.log("👤 Admin user update: Invalid role:", body.role)
      return NextResponse.json({ error: "Invalid role. Must be 'Admin' or 'Member'" }, { status: 400 })
    }

    // Build update query dynamically
    const updates = []
    const values = []

    if (body.name) {
      updates.push(`name = $${updates.length + 1}`)
      values.push(body.name)
    }

    if (body.email) {
      updates.push(`email = $${updates.length + 1}`)
      values.push(body.email)
    }

    if (body.role) {
      updates.push(`role = $${updates.length + 1}`)
      values.push(body.role)
      console.log("👤 Admin user update: Setting role to:", body.role)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Add user ID as the last parameter
    values.push(params.id)

    const updateQuery = `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length}`
    console.log("👤 Admin user update: Query:", updateQuery)
    console.log("👤 Admin user update: Values:", values)

    await sql.unsafe(updateQuery, values)

    // Verify the update by fetching the user
    const updatedUsers = await sql`
      SELECT id, name, email, role, profile_image, created_at
      FROM users 
      WHERE id = ${params.id}
    `

    if (updatedUsers.length === 0) {
      return NextResponse.json({ error: "User not found after update" }, { status: 404 })
    }

    const updatedUser = updatedUsers[0]
    console.log("👤 Admin user update: Updated user:", updatedUser.name, "New role:", updatedUser.role)

    // Log the action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, created_at)
      VALUES (
        (SELECT user_id FROM user_sessions WHERE id = ${sessionId}),
        'update_user',
        ${JSON.stringify({ userId: params.id, updates: body, newRole: updatedUser.role })},
        NOW()
      )
    `

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImage: updatedUser.profile_image,
      createdAt: updatedUser.created_at,
    })
  } catch (error) {
    console.error("👤 Admin user update: Error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const cookies = request.headers.get("cookie")
    if (!cookies) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionMatch = cookies.match(/session=([^;]+)/)
    if (!sessionMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionId = sessionMatch[1]
    const sql = neon(process.env.DATABASE_URL!)

    // Verify admin access
    const adminCheck = await sql`
      SELECT u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW() AND u.role = 'Admin'
    `

    if (adminCheck.length === 0) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Delete user and related data
    await sql`DELETE FROM user_sessions WHERE user_id = ${params.id}`
    await sql`DELETE FROM photo_uploads WHERE user_id = ${params.id}`
    await sql`DELETE FROM users WHERE id = ${params.id}`

    // Log the deletion
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, created_at)
      VALUES (
        (SELECT user_id FROM user_sessions WHERE id = ${sessionId}),
        'delete_user',
        ${JSON.stringify({ userId: params.id })},
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
