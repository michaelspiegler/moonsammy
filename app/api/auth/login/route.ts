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
      SELECT id, name, email, password_hash, role, profile_image_url 
      FROM users 
      WHERE email = ${email.toLowerCase()}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate session token
    const sessionToken = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store session in database, using the correct schema.
    // The session token is stored in the 'id' column.
    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (${sessionToken}, ${user.id}, ${expiresAt})
    `

    // Log activity
    await sql`
      INSERT INTO admin_logs (action, details, user_id, created_at)
      VALUES ('user_login', ${JSON.stringify({ email: user.email, ip: request.ip })}, ${user.id}, NOW())
    `

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profile_image_url,
    }

    // Create response with user data
    const response = NextResponse.json({
      user: userData,
      sessionToken,
      message: "Login successful",
    })

    // Set multiple cookies for compatibility
    response.cookies.set("sessionToken", sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

    response.cookies.set("session", sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

    response.cookies.set("auth-token", sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
