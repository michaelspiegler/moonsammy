import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const userId = uuidv4()
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (${userId}, ${name.trim()}, ${email.toLowerCase()}, ${hashedPassword}, 'user', NOW())
    `

    // Create session
    const sessionId = uuidv4()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${userId}, ${expiresAt})
    `

    // Log activity
    try {
      await sql`
        INSERT INTO activity_logs (id, action, user_id, user_name, user_email, details, created_at)
        VALUES (
          ${uuidv4()},
          'register',
          ${userId},
          ${name.trim()},
          ${email.toLowerCase()},
          ${JSON.stringify({ ip: request.headers.get("x-forwarded-for") || "unknown" })},
          NOW()
        )
      `
    } catch (logError) {
      console.error("Failed to log activity:", logError)
      // Don't fail the registration if logging fails
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
        role: "user",
        profileImage: null,
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
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
