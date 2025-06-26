import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

async function checkAdminAuth() {
  try {
    if (!process.env.DATABASE_URL) {
      return false
    }

    const cookieStore = await cookies()
    const sessionId =
      cookieStore.get("session")?.value ||
      cookieStore.get("auth-session")?.value ||
      cookieStore.get("user-session")?.value

    if (!sessionId) {
      return false
    }

    const sql = neon(process.env.DATABASE_URL)

    const sessions = await sql`
      SELECT u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    return sessions.length > 0 && sessions[0].role === "Admin"
  } catch (error) {
    console.error("Admin users auth check failed:", error)
    return false
  }
}

export async function GET(request: Request) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        users: [],
        error: "Database not configured. User management requires Neon database integration.",
      })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * limit

    const sql = neon(process.env.DATABASE_URL)

    let totalUsers = 0
    let users = []

    if (search.trim()) {
      // Search query with ILIKE for case-insensitive search
      const searchPattern = `%${search.trim()}%`

      // Get total count with search
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM users 
        WHERE name ILIKE ${searchPattern} OR email ILIKE ${searchPattern}
      `
      totalUsers = Number(countResult[0]?.total || 0)

      // Get users with search, pagination, and stats
      users = await sql`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.role,
          u.profile_image_url,
          u.created_at,
          u.updated_at,
          (SELECT COUNT(*) FROM photo_uploads WHERE user_id = u.id) as upload_count,
          (SELECT COUNT(*) FROM comments WHERE author = u.name) as comment_count
        FROM users u
        WHERE u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern}
        ORDER BY u.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      // No search - get all users
      const countResult = await sql`SELECT COUNT(*) as total FROM users`
      totalUsers = Number(countResult[0]?.total || 0)

      // Get users with pagination and stats
      users = await sql`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.role,
          u.profile_image_url,
          u.created_at,
          u.updated_at,
          (SELECT COUNT(*) FROM photo_uploads WHERE user_id = u.id) as upload_count,
          (SELECT COUNT(*) FROM comments WHERE author = u.name) as comment_count
        FROM users u
        ORDER BY u.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const totalPages = Math.ceil(totalUsers / limit)

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profile_image_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        uploadCount: Number(user.upload_count || 0),
        commentCount: Number(user.comment_count || 0),
      })),
      totalUsers,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      {
        users: [],
        totalUsers: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        error: "Failed to fetch users. Please try again.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { name, email, password, role = "Member" } = await request.json()

    // Validate input
    if (!name?.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 })
    }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    if (!["Member", "Admin"].includes(role)) {
      return NextResponse.json({ error: "Role must be Member or Admin" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await sql`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (${userId}, ${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, ${role}, NOW(), NOW())
    `

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: role,
        profileImage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadCount: 0,
        commentCount: 0,
      },
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
