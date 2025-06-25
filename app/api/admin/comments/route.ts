import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-session")?.value === "authenticated"
}

export async function GET() {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        comments: [],
        error: "Database not configured. Comments require Neon database integration.",
      })
    }

    try {
      const sql = neon(process.env.DATABASE_URL)

      // Add timeout and retry logic for database queries
      const comments = (await Promise.race([
        sql`
          SELECT id, photo_id, author, content, created_at as timestamp 
          FROM comments 
          ORDER BY created_at DESC
          LIMIT 1000
        `,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database query timeout")), 10000)),
      ])) as any[]

      return NextResponse.json({
        comments: comments.map((c) => ({
          ...c,
          photoId: c.photo_id,
        })),
      })
    } catch (dbError) {
      console.error("Database error in admin comments:", dbError)

      // Handle specific database errors
      if (dbError instanceof Error) {
        if (dbError.message.includes("timeout")) {
          return NextResponse.json({
            comments: [],
            error: "Database query timed out. Please try again.",
          })
        }

        if (dbError.message.includes("rate limit") || dbError.message.includes("Too Many Requests")) {
          return NextResponse.json({
            comments: [],
            error: "Database rate limit reached. Please wait a moment and try again.",
          })
        }

        if (dbError.message.includes("connection")) {
          return NextResponse.json({
            comments: [],
            error: "Database connection failed. Please check your Neon database configuration.",
          })
        }
      }

      return NextResponse.json({
        comments: [],
        error: "Failed to fetch comments from database.",
      })
    }
  } catch (error) {
    console.error("Error in admin comments API:", error)
    return NextResponse.json(
      {
        comments: [],
        error: "Failed to fetch comments. Please try again.",
      },
      { status: 500 },
    )
  }
}
