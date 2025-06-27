import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const sessionToken =
      request.cookies.get("session")?.value ||
      request.cookies.get("auth-session")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "")

    if (!sessionToken) {
      return NextResponse.json({ error: "No session token" }, { status: 401 })
    }

    // Find session
    const sessions = await sql`
      SELECT us.user_id, us.expires_at, u.id, u.name, u.email, u.role, u.profile_image_url
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.id = ${sessionToken} AND us.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
    }

    const session = sessions[0]

    return NextResponse.json({
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        profileImageUrl: session.profile_image_url,
      },
      sessionToken: sessionToken,
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
