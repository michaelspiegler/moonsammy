import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    console.log("🔍 Auth me: Starting auth check")

    const sessionId = request.headers.get("cookie")?.match(/session=([^;]+)/)?.[1]

    if (!sessionId) {
      console.log("🔍 Auth me: No session ID found")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Auth me: No database URL")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if session exists and is valid
    const sessions = await sql`
      SELECT s.*, u.name, u.email, u.role, u.profile_image
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      console.log("🔍 Auth me: No valid session found")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const session = sessions[0]
    console.log("🔍 Auth me: Valid session found for user:", session.name)

    return NextResponse.json(
      {
        user: {
          id: session.user_id,
          name: session.name,
          email: session.email,
          role: session.role,
          profileImage: session.profile_image,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("🔍 Auth me: Error during auth check:", error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
