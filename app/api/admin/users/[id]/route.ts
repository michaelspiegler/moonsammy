import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("👤 Admin get user: Fetching user:", params.id)

    // Check authentication
    const sessionId = request.headers.get("cookie")?.match(/session=([^;]+)/)?.[1]

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user details including role
    const users = await sql`
      SELECT id, name, email, role, profile_image, created_at
      FROM users 
      WHERE id = ${params.id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]
    console.log("👤 Admin get user: Found user:", user.name, "Role:", user.role)

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profile_image,
        createdAt: user.created_at,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("👤 Admin get user: Error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("👤 Admin update user: Starting update for user:", params.id)

    // Check authentication
    const sessionId = request.headers.get("cookie")?.match(/session=([^;]+)/)?.[1]

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { role } = body

    console.log("👤 Admin update user: Updating role to:", role)

    // Validate role
    if (!role || !["Admin", "Member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Update user role
    await sql`
      UPDATE users 
      SET role = ${role}
      WHERE id = ${params.id}
    `

    // Verify the update
    const updatedUsers = await sql`
      SELECT id, name, email, role, profile_image, created_at
      FROM users 
      WHERE id = ${params.id}
    `

    if (updatedUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updatedUser = updatedUsers[0]
    console.log("👤 Admin update user: Role updated successfully. New role:", updatedUser.role)

    // Log admin activity
    try {
      const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await sql`
        INSERT INTO admin_logs (id, admin_id, action, details, created_at)
        VALUES (${activityId}, ${sessions[0].user_id}, 'update_user_role', ${JSON.stringify({
          userId: params.id,
          newRole: role,
          userName: updatedUser.name,
        })}, NOW())
      `
      console.log("👤 Admin update user: Logged admin activity")
    } catch (logError) {
      console.error("👤 Admin update user: Failed to log activity:", logError)
    }

    return NextResponse.json(
      {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profileImage: updatedUser.profile_image,
        createdAt: updatedUser.created_at,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("👤 Admin update user: Error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
