import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, name, password_hash, role, profile_image_url, created_at
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

    // Generate session token
    const sessionToken = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create session
    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${user.id}, ${sessionToken}, ${expiresAt})
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        session_token = ${sessionToken},
        expires_at = ${expiresAt},
        updated_at = CURRENT_TIMESTAMP
    `

    // Log activity
    await sql`
      INSERT INTO admin_logs (action, details, user_id, created_at)
      VALUES ('user_login', ${JSON.stringify({ email, user_id: user.id })}, ${user.id}, CURRENT_TIMESTAMP)
    `

    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileImageUrl: user.profile_image_url,
      createdAt: user.created_at,
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
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
