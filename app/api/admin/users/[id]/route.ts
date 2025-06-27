import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

// Use the same authentication system as other admin endpoints
async function checkAdminAuth() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("🔍 Admin user edit: No database URL")
      return false
    }

    const cookieStore = await cookies()

    // Use the same session cookie names as the main auth system
    const sessionId =
      cookieStore.get("session")?.value ||
      cookieStore.get("auth-session")?.value ||
      cookieStore.get("user-session")?.value

    if (!sessionId) {
      console.log("🔍 Admin user edit: No session ID found")
      return false
    }

    console.log("🔍 Admin user edit: Using session ID:", sessionId.substring(0, 20) + "...")

    const sql = neon(process.env.DATABASE_URL)

    // Check if user has admin role using the same query structure as auth/me
    const sessions = await sql`
      SELECT u.role, u.name, u.email, s.expires_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    if (sessions.length === 0) {
      console.log("🔍 Admin user edit: No valid session found")
      return false
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    console.log("🔍 Admin user edit: Session details:")
    console.log("  - User:", session.name)
    console.log("  - Email:", session.email)
    console.log("  - Role:", session.role)
    console.log("  - Expires:", expiresAt.toISOString())
    console.log("  - Valid:", expiresAt > now)

    if (expiresAt <= now) {
      console.log("🔍 Admin user edit: Session expired")
      return false
    }

    const isAdmin = session.role === "Admin"
    console.log("🔍 Admin user edit: Is admin?", isAdmin, "(role:", session.role, ")")

    return isAdmin
  } catch (error) {
    console.error("🔍 Admin user edit: Auth check failed:", error)
    return false
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const userId = params.id
    const sql = neon(process.env.DATABASE_URL)

    const users = await sql`
      SELECT 
        id, 
        name, 
        email, 
        role,
        profile_image_url,
        created_at,
        updated_at
      FROM users 
      WHERE id = ${userId}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]

    // Get user's uploads and comments
    const [uploads, comments] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM photo_uploads WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*) as count FROM comments WHERE author = ${user.name}`,
    ])

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profile_image_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        uploadCount: Number(uploads[0]?.count || 0),
        commentCount: Number(comments[0]?.count || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const userId = params.id
    const { name, email, password, role } = await request.json()

    console.log("🔧 Admin updating user:", { userId, name, email, role })

    // Validate input
    if (!name?.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 })
    }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Validate role if provided
    if (role && !["Admin", "Member"].includes(role)) {
      return NextResponse.json({ error: "Role must be either 'Admin' or 'Member'" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if user exists
    const existingUser = await sql`SELECT id, name, role FROM users WHERE id = ${userId}`
    if (existingUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("🔧 Current user data:", existingUser[0])

    // Check if email is taken by another user
    const emailCheck = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} AND id != ${userId}
    `
    if (emailCheck.length > 0) {
      return NextResponse.json({ error: "Email already taken by another user" }, { status: 400 })
    }

    const oldName = existingUser[0].name
    const oldRole = existingUser[0].role

    // Build update query dynamically
    let updateQuery = `
      UPDATE users 
      SET name = $1, 
          email = $2,
          updated_at = NOW()
    `
    const queryParams = [name.trim(), email.toLowerCase().trim()]
    let paramIndex = 3

    // Add password if provided
    if (password && password.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(password.trim(), 12)
      updateQuery += `, password_hash = $${paramIndex}`
      queryParams.push(passwordHash)
      paramIndex++
    }

    // Add role if provided
    if (role) {
      updateQuery += `, role = $${paramIndex}`
      queryParams.push(role)
      paramIndex++
    }

    updateQuery += ` WHERE id = $${paramIndex}`
    queryParams.push(userId)

    console.log("🔧 Update query:", updateQuery)
    console.log(
      "🔧 Query params:",
      queryParams.map((p, i) => (i === 2 && password ? "[PASSWORD_HASH]" : p)),
    )

    // Execute the update
    const result = await sql.unsafe(updateQuery, queryParams)
    console.log("🔧 Update result:", result)

    // If name changed, update comments to reflect new name
    if (oldName !== name.trim()) {
      console.log("🔧 Updating comments for name change:", oldName, "->", name.trim())
      await sql`
        UPDATE comments 
        SET author = ${name.trim()}
        WHERE author = ${oldName}
      `

      // Update photo uploads uploader name if it changed
      await sql`
        UPDATE photo_uploads 
        SET uploader_name = ${name.trim()}
        WHERE user_id = ${userId}
      `
    }

    // Log role change if it happened
    if (role && oldRole !== role) {
      console.log("🔧 Role changed:", oldRole, "->", role)
    }

    // Verify the update worked by fetching the user again
    const updatedUser = await sql`SELECT id, name, email, role FROM users WHERE id = ${userId}`
    console.log("🔧 Updated user data:", updatedUser[0])

    return NextResponse.json({
      success: true,
      user: updatedUser[0],
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const userId = params.id
    const sql = neon(process.env.DATABASE_URL)

    // Check if user exists
    const existingUser = await sql`SELECT id, name FROM users WHERE id = ${userId}`
    if (existingUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userName = existingUser[0].name

    // Delete user and related data (in order due to foreign key constraints)
    await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`
    await sql`DELETE FROM comments WHERE author = ${userName}`
    await sql`DELETE FROM likes WHERE author = ${userName}`
    await sql`DELETE FROM photo_uploads WHERE user_id = ${userId}`
    await sql`DELETE FROM users WHERE id = ${userId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
