import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { del } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-session")?.value === "authenticated"
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const photoId = params.id

    // Delete from Vercel Blob
    await del(photoId)

    // Delete from database if available
    if (process.env.DATABASE_URL) {
      try {
        const sql = neon(process.env.DATABASE_URL)
        await sql`DELETE FROM comments WHERE photo_id = ${photoId}`
        await sql`DELETE FROM photo_metadata WHERE id = ${photoId}`
      } catch (dbError) {
        console.log("Database cleanup failed, but blob deleted")
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting photo:", error)
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
  }
}
