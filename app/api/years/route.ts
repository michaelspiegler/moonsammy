import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ years: [] })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get all unique years that have photos
    const yearsData = await sql`
      SELECT DISTINCT pm.year, COUNT(*) as photo_count
      FROM photo_metadata pm
      WHERE pm.year IS NOT NULL
      GROUP BY pm.year
      ORDER BY pm.year DESC
    `

    const years = yearsData.map((row) => ({
      year: row.year,
      photoCount: Number(row.photo_count),
    }))

    return NextResponse.json({ years })
  } catch (error) {
    console.error("Error fetching years:", error)
    return NextResponse.json({ years: [] })
  }
}
