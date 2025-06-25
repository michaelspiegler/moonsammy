import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get all tags that are actually associated with existing photos
    const tags = await sql`
      SELECT DISTINCT pt.tag_name, COUNT(*) as photo_count
      FROM photo_tags pt
      INNER JOIN photo_metadata pm ON pt.photo_id = pm.id
      GROUP BY pt.tag_name
      ORDER BY photo_count DESC, pt.tag_name ASC
    `

    console.log(`🏷️ Found ${tags.length} active tags`)

    const formattedTags = tags.map((tag) => ({
      name: tag.tag_name,
      count: Number(tag.photo_count),
    }))

    return NextResponse.json({
      tags: formattedTags,
    })
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 })
  }
}
