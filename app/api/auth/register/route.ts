import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { name, email, password } = await request.json()

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
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES (${userId}, ${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, NOW(), NOW())
    `

    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at, created_at)
      VALUES (${sessionId}, ${userId}, ${expiresAt.toISOString()}, NOW())
    `

    console.log("🍪 Setting session cookie:", sessionId)

    // Create response with user data AND session token
    const response = NextResponse.json({
      success: true,
      sessionToken: sessionId, // Include session token in response
      user: { id: userId, name: name.trim(), email: email.toLowerCase().trim() },
    })

    // Set cookies with more persistent settings
    const cookieOptions = {
      httpOnly: false, // Allow JavaScript access for debugging
      secure: false, // Set to false for development, true for production
      sameSite: "lax" as const, // More permissive for navigation
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    }

    // Set multiple cookies for redundancy
    response.cookies.set("session", sessionId, cookieOptions)
    response.cookies.set("auth-session", sessionId, cookieOptions)
    response.cookies.set("user-session", sessionId, cookieOptions)

    console.log("🍪 Set cookies with options:", cookieOptions)

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
