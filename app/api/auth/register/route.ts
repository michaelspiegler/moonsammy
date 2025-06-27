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

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const userId = uuidv4()
    await sql`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (${userId}, ${name}, ${email}, ${passwordHash}, 'user')
    `

    // Create session
    const sessionId = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${userId}, ${expiresAt})
    `

    // Log activity with proper ID and JSON
    const activityId = uuidv4()
    const logDetails = {
      email: email,
      name: name,
      timestamp: new Date().toISOString(),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    }

    await sql`
      INSERT INTO activity_logs (id, user_id, user_name, user_email, action, details)
      VALUES (${activityId}, ${userId}, ${name}, ${email}, 'register', ${JSON.stringify(logDetails)})
    `

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: name,
        email: email,
        role: "user",
        profileImageUrl: null,
      },
      sessionToken: sessionId,
    })

    // Set cookies
    response.cookies.set("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    })

    response.cookies.set("auth-session", sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
