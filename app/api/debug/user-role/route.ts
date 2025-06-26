import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No database URL" })
    }

    // Get session from cookies
    const sessionFromCookie = request.cookies.get("session")?.value
    const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
    const sessionFromUserCookie = request.cookies.get("user-session")?.value

    const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromUserCookie

    console.log("🔍 Debug: Session ID found:", sessionId ? sessionId.substring(0, 20) + "..." : "none")

    if (!sessionId) {
      return NextResponse.json({ error: "No session found", cookies: request.cookies.getAll() })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get detailed user and session info
    const sessions = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.created_at,
        u.updated_at,
        s.id as session_id,
        s.expires_at,
        s.created_at as session_created
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    console.log("🔍 Debug: Sessions found:", sessions.length)

    if (sessions.length === 0) {
      return NextResponse.json({
        error: "Session not found in database",
        sessionId: sessionId.substring(0, 20) + "...",
        allSessions: await sql`SELECT id, user_id, expires_at FROM user_sessions LIMIT 5`,
      })
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    return NextResponse.json({
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      session: {
        id: session.session_id,
        expires_at: session.expires_at,
        created_at: session.session_created,
        is_expired: expiresAt <= now,
        time_until_expiry_minutes: Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60),
      },
      debug: {
        sessionId: sessionId.substring(0, 20) + "...",
        cookies: request.cookies.getAll().map((c) => ({ name: c.name, value: c.value?.substring(0, 20) + "..." })),
      },
    })
  } catch (error) {
    console.error("🔍 Debug error:", error)
    return NextResponse.json({ error: error.message })
  }
}
