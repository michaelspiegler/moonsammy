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
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUsers = await sql`
      INSERT INTO users (name, email, password, role, created_at)
      VALUES (${name}, ${email}, ${hashedPassword}, 'user', NOW())
      RETURNING id, name, email, role, profile_image
    `

    const newUser = newUsers[0]

    // Generate session token
    const sessionToken = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store session in database
    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${newUser.id}, ${sessionToken}, ${expiresAt})
    `

    // Log activity
    await sql`
      INSERT INTO admin_logs (action, details, user_id, created_at)
      VALUES ('user_register', ${JSON.stringify({ email, name, ip: request.ip })}, ${newUser.id}, NOW())
    `

    const userData = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      profileImage: newUser.profile_image,
      sessionToken,
    }

    // Create response with user data
    const response = NextResponse.json({
      user: userData,
      sessionToken,
      message: "Registration successful",
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
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
