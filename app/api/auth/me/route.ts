import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Auth me: Starting auth check...")

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Auth me: No database URL")
      return NextResponse.json({ user: null })
    }

    // Try multiple ways to get session ID with better logging
    const sessionFromCookie = request.cookies.get("session")?.value
    const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
    const sessionFromUserCookie = request.cookies.get("user-session")?.value
    const sessionFromHeader = request.headers.get("x-session-token")

    console.log(
      "🔍 Auth me: All cookies:",
      Object.fromEntries(request.cookies.getAll().map((c) => [c.name, c.value?.substring(0, 20) + "..."])),
    )
    console.log(
      "🔍 Auth me: Session from 'session' cookie:",
      sessionFromCookie ? sessionFromCookie.substring(0, 20) + "..." : "missing",
    )
    console.log(
      "🔍 Auth me: Session from 'auth-session' cookie:",
      sessionFromAuthCookie ? sessionFromAuthCookie.substring(0, 20) + "..." : "missing",
    )
    console.log(
      "🔍 Auth me: Session from 'user-session' cookie:",
      sessionFromUserCookie ? sessionFromUserCookie.substring(0, 20) + "..." : "missing",
    )
    console.log(
      "🔍 Auth me: Session from header:",
      sessionFromHeader ? sessionFromHeader.substring(0, 20) + "..." : "missing",
    )

    const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromUserCookie || sessionFromHeader

    if (!sessionId) {
      console.log("🔍 Auth me: No session found anywhere")
      return NextResponse.json({ user: null })
    }

    console.log("🔍 Auth me: Using session ID:", sessionId.substring(0, 20) + "...")

    const sql = neon(process.env.DATABASE_URL)

    // Get user from session and clean up expired sessions
    const sessions = await sql`
      SELECT u.id, u.name, u.email, u.profile_image_url, s.expires_at, s.id as session_id
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    console.log("🔍 Auth me: Found sessions in database:", sessions.length)

    if (sessions.length === 0) {
      console.log("🔍 Auth me: Session not found in database")
      return NextResponse.json({ user: null })
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    console.log("🔍 Auth me: Session expires at:", expiresAt.toISOString())
    console.log("🔍 Auth me: Current time:", now.toISOString())
    console.log(
      "🔍 Auth me: Time until expiry:",
      Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60),
      "minutes",
    )

    if (expiresAt <= now) {
      console.log("🔍 Auth me: Session expired, cleaning up")
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return NextResponse.json({ user: null })
    }

    // Extend session if it's close to expiring (less than 1 day left)
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const oneDayInMs = 24 * 60 * 60 * 1000

    if (timeUntilExpiry < oneDayInMs) {
      console.log("🔍 Auth me: Extending session expiry")
      const newExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      await sql`
        UPDATE user_sessions 
        SET expires_at = ${newExpiryDate.toISOString()}
        WHERE id = ${sessionId}
      `
    }

    console.log("🔍 Auth me: Valid session found for user:", session.name)

    // Valid session - return user data and ensure cookies are set
    const userData = {
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        profileImage: session.profile_image_url,
      },
    }

    const response = NextResponse.json(userData)

    // Ensure session cookies are properly set with consistent options
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

    console.log("🔍 Auth me: Returning user data with refreshed cookies")
    return response
  } catch (error) {
    console.error("🔍 Auth me: Error during auth check:", error)
    return NextResponse.json({ user: null })
  }
}
