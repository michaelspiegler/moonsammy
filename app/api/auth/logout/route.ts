import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session")?.value || request.cookies.get("auth-session")?.value

    if (sessionToken) {
      // Delete session from database
      await sql`
        DELETE FROM user_sessions WHERE id = ${sessionToken}
      `
    }

    const response = NextResponse.json({ success: true })

    // Clear cookies
    response.cookies.delete("session")
    response.cookies.delete("auth-session")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
