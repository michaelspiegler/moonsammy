import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Find user by email
    const users = await sql`
      SELECT id, name, email, password_hash, role, profile_image_url
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
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at, created_at)
      VALUES (${sessionId}, ${user.id}, ${expiryDate.toISOString()}, NOW())
    `

    console.log("🔍 Login: Created session for user:", user.name, "Session ID:", sessionId.substring(0, 20) + "...")

    const response = NextResponse.json({
      success: true,
      sessionToken: sessionId, // Include session token in response
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "Member",
        profileImage: user.profile_image_url,
        sessionToken: sessionId, // Also include in user object
      },
    })

    // Set multiple cookies for redundancy
    const cookieOptions = {
      httpOnly: false, // Allow JavaScript access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    }

    response.cookies.set("session", sessionId, cookieOptions)
    response.cookies.set("auth-session", sessionId, cookieOptions)
    response.cookies.set("user-session", sessionId, cookieOptions)

    console.log("🔍 Login: Set cookies and returning success")
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
