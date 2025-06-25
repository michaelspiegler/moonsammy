import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Auth me: Starting auth check...")

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Auth me: No database URL")
      return NextResponse.json({ user: null })
    }

    // Try multiple ways to get session ID
    const sessionFromCookie = request.cookies.get("session")?.value
    const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
    const sessionFromUserCookie = request.cookies.get("user-session")?.value
    const sessionFromHeader = request.headers.get("x-session-token")

    console.log("🔍 Auth me: Session from 'session' cookie:", sessionFromCookie ? "exists" : "missing")
    console.log("🔍 Auth me: Session from 'auth-session' cookie:", sessionFromAuthCookie ? "exists" : "missing")
    console.log("🔍 Auth me: Session from 'user-session' cookie:", sessionFromUserCookie ? "exists" : "missing")
    console.log("🔍 Auth me: Session from header:", sessionFromHeader ? "exists" : "missing")

    const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromUserCookie || sessionFromHeader

    if (!sessionId) {
      console.log("🔍 Auth me: No session found anywhere")
      return NextResponse.json({ user: null })
    }

    console.log("🔍 Auth me: Using session ID:", sessionId.substring(0, 20) + "...")

    const sql = neon(process.env.DATABASE_URL)

    // Get user from session and clean up expired sessions
    const sessions = await sql`
      SELECT u.id, u.name, u.email, u.profile_image_url, s.expires_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    console.log("🔍 Auth me: Found sessions in database:", sessions.length)

    if (sessions.length === 0) {
      console.log("🔍 Auth me: Session not found in database")
      // Don't delete cookies here, let them expire naturally
      return NextResponse.json({ user: null })
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    console.log("🔍 Auth me: Session expires at:", expiresAt.toISOString())
    console.log("🔍 Auth me: Current time:", now.toISOString())

    if (expiresAt <= now) {
      console.log("🔍 Auth me: Session expired, cleaning up")
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return NextResponse.json({ user: null })
    }

    console.log("🔍 Auth me: Valid session found for user:", session.name)

    // Valid session - return user data
    const userData = {
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        profileImage: session.profile_image_url,
      },
    }

    console.log("🔍 Auth me: Returning user data:", userData)
    return NextResponse.json(userData)
  } catch (error) {
    console.error("🔍 Auth me: Error during auth check:", error)
    return NextResponse.json({ user: null })
  }
}
