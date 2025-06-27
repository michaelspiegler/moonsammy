import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    console.log("🔍 Auth me: Starting auth check")

    const cookies = request.headers.get("cookie")
    console.log("🔍 Auth me: Cookies received:", cookies ? "present" : "none")

    if (!cookies) {
      console.log("🔍 Auth me: No cookies found")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const sessionMatch = cookies.match(/session=([^;]+)/)
    if (!sessionMatch) {
      console.log("🔍 Auth me: No session cookie found")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const sessionId = sessionMatch[1]
    console.log("🔍 Auth me: Session ID found:", sessionId.substring(0, 8) + "...")

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Auth me: No database URL configured")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if session exists and is valid
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.name, u.email, u.role, u.profile_image
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    console.log("🔍 Auth me: Session query result:", sessions.length > 0 ? "found" : "not found")

    if (sessions.length === 0) {
      console.log("🔍 Auth me: Session not found or expired")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const session = sessions[0]
    console.log("🔍 Auth me: User authenticated:", session.name, "Role:", session.role)

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
    // Always return 200 to prevent JSON parsing issues
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
