import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        tags: [],
        error: "Database not configured",
      })
    }

    const sql = neon(process.env.DATABASE_URL)

    let tags
    if (query && query.trim()) {
      // Search for tags that match the query
      tags = await sql`
        SELECT DISTINCT t.id, t.name, COUNT(pt.photo_id) as usage_count
        FROM tags t
        LEFT JOIN photo_tags pt ON t.id = pt.tag_id
        WHERE LOWER(t.name) LIKE LOWER(${`%${query.trim()}%`})
        GROUP BY t.id, t.name
        ORDER BY usage_count DESC, t.name ASC
        LIMIT 10
      `
    } else {
      // Return most popular tags
      tags = await sql`
        SELECT DISTINCT t.id, t.name, COUNT(pt.photo_id) as usage_count
        FROM tags t
        LEFT JOIN photo_tags pt ON t.id = pt.tag_id
        GROUP BY t.id, t.name
        HAVING COUNT(pt.photo_id) > 0
        ORDER BY usage_count DESC, t.name ASC
        LIMIT 10
      `
    }

    return NextResponse.json({
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        usageCount: Number(tag.usage_count),
      })),
    })
  } catch (error) {
    console.error("Error searching tags:", error)
    return NextResponse.json({
      tags: [],
      error: "Failed to search tags",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
