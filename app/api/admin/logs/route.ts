import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-session")?.value === "authenticated"
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAuth())) {
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
