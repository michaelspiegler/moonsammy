import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("=== Admin Users GET Request ===")

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * limit

    console.log("Query params:", { page, limit, search, offset })

    // Build search condition
    let searchCondition = ""
    const searchParams_sql = []

    if (search.trim()) {
      searchCondition = `WHERE (u.name ILIKE $${searchParams_sql.length + 1} OR u.email ILIKE $${searchParams_sql.length + 1})`
      searchParams_sql.push(`%${search.trim()}%`)
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users u ${searchCondition}`
    const countResult = await sql.unsafe(countQuery, searchParams_sql)
    const totalUsers = Number.parseInt(countResult[0].total)

    console.log("Total users found:", totalUsers)

    // Get users with pagination
    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.profile_image,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(*) FROM photo_uploads p WHERE p.user_id = u.id) as upload_count,
        (SELECT COUNT(*) FROM comments c WHERE c.author = u.name) as comment_count
      FROM users u
      ${searchCondition}
      ORDER BY u.created_at DESC
      LIMIT $${searchParams_sql.length + 1} OFFSET $${searchParams_sql.length + 2}
    `

    const users = await sql.unsafe(usersQuery, [...searchParams_sql, limit, offset])

    console.log("Users retrieved:", users.length)

    // Calculate pagination info
    const totalPages = Math.ceil(totalUsers / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'VIEW_USERS',
        ${JSON.stringify({ page, limit, search, totalUsers })},
        NOW()
      )
    `

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profile_image,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        uploadCount: Number.parseInt(user.upload_count),
        commentCount: Number.parseInt(user.comment_count),
      })),
      totalUsers,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
    })
  } catch (error) {
    console.error("Admin users GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Admin Users POST Request ===")

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

    const { name, email, password, role } = await request.json()
    console.log("Creating user:", { name, email, role })

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Hash password (simple hash for demo - use bcrypt in production)
    const hashedPassword = Buffer.from(password).toString("base64")

    // Create user
    const newUser = await sql`
      INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
      VALUES (${name}, ${email.toLowerCase()}, ${hashedPassword}, ${role || "Member"}, NOW(), NOW())
      RETURNING id, name, email, role, created_at, updated_at
    `

    console.log("User created successfully:", newUser[0].id)

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'CREATE_USER',
        ${JSON.stringify({
          newUserId: newUser[0].id,
          name,
          email,
          role: role || "Member",
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      user: {
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email,
        role: newUser[0].role,
        createdAt: newUser[0].created_at,
        updatedAt: newUser[0].updated_at,
        uploadCount: 0,
        commentCount: 0,
      },
      message: "User created successfully",
    })
  } catch (error) {
    console.error("Admin users POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
