import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { email, password } = await request.json()

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Find user
    const users = await sql`
      SELECT id, name, email, password_hash, profile_image_url 
      FROM users 
      WHERE email = ${email.toLowerCase().trim()}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at, created_at)
      VALUES (${sessionId}, ${user.id}, ${expiresAt.toISOString()}, NOW())
    `

    console.log("🍪 Setting session cookie:", sessionId)

    // Create response with user data AND session token
    const response = NextResponse.json({
      success: true,
      sessionToken: sessionId, // Include session token in response
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profile_image_url,
      },
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
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
