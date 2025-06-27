import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Auth me: Starting auth check")

    const sessionToken = request.cookies.get("session_token")?.value
    console.log("🔍 Auth me: Session token present:", !!sessionToken)

    if (!sessionToken) {
      console.log("🔍 Auth me: No session token found")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Auth me: No database URL configured")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if session exists and is valid
    const sessions = await sql`
      SELECT s.*, u.name, u.email, u.role, u.profile_image
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ${sessionToken}
      AND s.expires_at > NOW()
    `

    console.log("🔍 Auth me: Sessions found:", sessions.length)

    if (sessions.length === 0) {
      console.log("🔍 Auth me: No valid session found")
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const session = sessions[0]
    console.log("🔍 Auth me: Valid session found for user:", session.email)

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
    // Always return 200 to avoid JSON parsing issues
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
