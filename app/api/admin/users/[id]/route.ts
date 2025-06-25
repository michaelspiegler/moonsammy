import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-session")?.value === "authenticated"
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAuth())) {
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
    if (!(await checkAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const userId = params.id
    const { name, email, password } = await request.json()

    // Validate input
    if (!name?.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 })
    }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if user exists
    const existingUser = await sql`SELECT id, name FROM users WHERE id = ${userId}`
    if (existingUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if email is taken by another user
    const emailCheck = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} AND id != ${userId}
    `
    if (emailCheck.length > 0) {
      return NextResponse.json({ error: "Email already taken by another user" }, { status: 400 })
    }

    const oldName = existingUser[0].name

    // Update user (with or without password)
    if (password && password.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(password.trim(), 12)
      await sql`
        UPDATE users 
        SET name = ${name.trim()}, 
            email = ${email.toLowerCase().trim()}, 
            password_hash = ${passwordHash},
            updated_at = NOW()
        WHERE id = ${userId}
      `
    } else {
      await sql`
        UPDATE users 
        SET name = ${name.trim()}, 
            email = ${email.toLowerCase().trim()},
            updated_at = NOW()
        WHERE id = ${userId}
      `
    }

    // If name changed, update comments to reflect new name
    if (oldName !== name.trim()) {
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAuth())) {
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
