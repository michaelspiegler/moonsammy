import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value

    if (sessionId && process.env.DATABASE_URL) {
      const sql = neon(process.env.DATABASE_URL)
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete("session")
    return response
  } catch (error) {
    console.error("Logout error:", error)
    const response = NextResponse.json({ success: true })
    response.cookies.delete("session")
    return response
  }
}
