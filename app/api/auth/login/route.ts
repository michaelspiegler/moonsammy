import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Find user by email
    const users = await sql`
      SELECT id, name, email, password_hash, role, profile_image_url, created_at
      FROM users 
      WHERE email = ${email.toLowerCase()}
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
    const sessionId = uuidv4()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${user.id}, ${expiresAt})
    `

    // Log activity
    try {
      await sql`
        INSERT INTO activity_logs (id, action, user_id, user_name, user_email, details, created_at)
        VALUES (
          ${uuidv4()},
          'login',
          ${user.id},
          ${user.name},
          ${user.email},
          ${JSON.stringify({ ip: request.headers.get("x-forwarded-for") || "unknown" })},
          NOW()
        )
      `
    } catch (logError) {
      console.error("Failed to log activity:", logError)
      // Don't fail the login if logging fails
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profile_image_url,
        sessionToken: sessionId,
      },
    })

    // Set multiple cookies for compatibility
    response.cookies.set("session", sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })

    response.cookies.set("auth-session", sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
