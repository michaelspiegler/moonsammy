import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user
    const newUsers = await sql`
      INSERT INTO users (name, email, password_hash, role, created_at)
      VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, 'user', CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, profile_image_url, created_at
    `

    const newUser = newUsers[0]

    // Generate session token
    const sessionToken = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create session
    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${newUser.id}, ${sessionToken}, ${expiresAt})
    `

    // Log activity
    await sql`
      INSERT INTO admin_logs (action, details, user_id, created_at)
      VALUES ('user_register', ${JSON.stringify({ email, user_id: newUser.id })}, ${newUser.id}, CURRENT_TIMESTAMP)
    `

    // Prepare user data
    const userData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      profileImageUrl: newUser.profile_image_url,
      createdAt: newUser.created_at,
    }

    // Create response with user data and session token
    const response = NextResponse.json({
      success: true,
      user: userData,
      sessionToken: sessionToken,
    })

    // Set multiple cookies for compatibility
    response.cookies.set("sessionToken", sessionToken, {
      httpOnly: false, // Allow JavaScript access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

    response.cookies.set("session", sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    })

    response.cookies.set("auth-token", sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
