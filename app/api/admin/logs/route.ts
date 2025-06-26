import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

async function checkAdminAuth() {
  try {
    if (!process.env.DATABASE_URL) {
      return false
    }

    const cookieStore = await cookies()
    const sessionId =
      cookieStore.get("session")?.value ||
      cookieStore.get("auth-session")?.value ||
      cookieStore.get("user-session")?.value

    if (!sessionId) {
      return false
    }

    const sql = neon(process.env.DATABASE_URL)

    const sessions = await sql`
      SELECT u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    return sessions.length > 0 && sessions[0].role === "Admin"
  } catch (error) {
    console.error("Admin logs auth check failed:", error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const action = searchParams.get("action") // Filter by action type
    const offset = (page - 1) * limit

    const sql = neon(process.env.DATABASE_URL)

    // Build query with optional action filter
    let whereClause = ""
    let queryParams = []

    if (action) {
      whereClause = "WHERE action = $1"
      queryParams = [action]
    }

    // Get logs with pagination
    const logs = await sql`
      SELECT 
        id,
        action,
        target_type,
        target_id,
        details,
        created_at
      FROM admin_logs
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get total count
    const totalResult = await sql`
      SELECT COUNT(*) as total
      FROM admin_logs
      ${whereClause ? sql.unsafe(whereClause) : sql``}
    `

    const total = Number.parseInt(totalResult[0].total)
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        details: typeof log.details === "string" ? JSON.parse(log.details) : log.details,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalLogs: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching admin logs:", error)
    return NextResponse.json({ error: "Failed to fetch admin logs" }, { status: 500 })
  }
}
