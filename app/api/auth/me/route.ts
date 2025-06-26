import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Auth me: Starting auth check...")

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Auth me: No database URL")
      return NextResponse.json({ user: null })
    }

    // Get all possible session sources
    const cookieStore = request.cookies
    const allCookies = cookieStore.getAll()
    console.log(
      "🔍 Auth me: All cookies received:",
      allCookies.map((c) => `${c.name}=${c.value.substring(0, 10)}...`),
    )

    const sessionFromCookie = cookieStore.get("session")?.value
    const sessionFromAuthCookie = cookieStore.get("auth-session")?.value
    const sessionFromUserCookie = cookieStore.get("user-session")?.value
    const sessionFromHeader = request.headers.get("x-session-token")

    console.log("🔍 Auth me: Session sources:")
    console.log("  - session cookie:", sessionFromCookie ? "EXISTS" : "MISSING")
    console.log("  - auth-session cookie:", sessionFromAuthCookie ? "EXISTS" : "MISSING")
    console.log("  - user-session cookie:", sessionFromUserCookie ? "EXISTS" : "MISSING")
    console.log("  - x-session-token header:", sessionFromHeader ? "EXISTS" : "MISSING")

    const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromUserCookie || sessionFromHeader

    if (!sessionId) {
      console.log("🔍 Auth me: No session ID found from any source")
      return NextResponse.json({ user: null })
    }

    console.log("🔍 Auth me: Using session ID:", sessionId.substring(0, 20) + "...")

    const sql = neon(process.env.DATABASE_URL)

    // Get user from session including role
    const sessions = await sql`
      SELECT u.id, u.name, u.email, u.profile_image_url, u.role, s.expires_at, s.id as session_id
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    console.log("🔍 Auth me: Database query returned:", sessions.length, "sessions")

    if (sessions.length === 0) {
      console.log("🔍 Auth me: Session not found in database")
      return NextResponse.json({ user: null })
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    console.log("🔍 Auth me: Session details:")
    console.log("  - User:", session.name)
    console.log("  - Role:", session.role)
    console.log("  - Expires:", expiresAt.toISOString())
    console.log("  - Current:", now.toISOString())
    console.log("  - Valid:", expiresAt > now)

    if (expiresAt <= now) {
      console.log("🔍 Auth me: Session expired, cleaning up")
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return NextResponse.json({ user: null })
    }

    // Extend session if it's close to expiring
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const oneDayInMs = 24 * 60 * 60 * 1000

    if (timeUntilExpiry < oneDayInMs) {
      console.log("🔍 Auth me: Extending session expiry")
      const newExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await sql`
        UPDATE user_sessions 
        SET expires_at = ${newExpiryDate.toISOString()}
        WHERE id = ${sessionId}
      `
    }

    console.log("🔍 Auth me: Valid session found - returning user data")

    // Return user data including role
    const userData = {
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role || "Member",
        profileImage: session.profile_image_url,
        sessionToken: sessionId,
      },
    }

    const response = NextResponse.json(userData)

    // Force set cookies with multiple strategies
    const cookieOptions = {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    }

    // Set multiple cookie names for redundancy
    response.cookies.set("session", sessionId, cookieOptions)
    response.cookies.set("auth-session", sessionId, cookieOptions)
    response.cookies.set("user-session", sessionId, cookieOptions)

    console.log("🔍 Auth me: Set cookies and returning user data with role:", session.role)
    return response
  } catch (error) {
    console.error("🔍 Auth me: Error during auth check:", error)
    return NextResponse.json({ user: null })
  }
}
