import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("=== Admin Photos GET Request ===")

    // Get session from cookies
    const sessionCookie =
      request.cookies.get("session")?.value ||
      request.cookies.get("auth-session")?.value ||
      request.cookies.get("user-session")?.value

    console.log("Session cookie found:", !!sessionCookie)

    if (!sessionCookie) {
      console.log("No session cookie found")
      return NextResponse.json({ error: "No session found" }, { status: 401 })
    }

    // Verify admin session
    const sessionResult = await sql`
      SELECT us.*, u.role, u.name, u.email
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ${sessionCookie}
        AND us.expires_at > NOW()
        AND u.role = 'Admin'
    `

    console.log("Session query result:", sessionResult.length > 0 ? "Valid admin session" : "Invalid session")

    if (sessionResult.length === 0) {
      console.log("Invalid admin session or user not admin")
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const adminUser = sessionResult[0]
    console.log("Admin user:", adminUser.name, adminUser.email)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * limit

    console.log("Query params:", { page, limit, search, offset })

    // Build search condition
    let searchCondition = ""
    const searchParams_sql = []

    if (search.trim()) {
      searchCondition = `
        WHERE (
          p.filename ILIKE $${searchParams_sql.length + 1} OR
          p.title ILIKE $${searchParams_sql.length + 1} OR
          u.name ILIKE $${searchParams_sql.length + 1}
        )
      `
      searchParams_sql.push(`%${search.trim()}%`)
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM photo_uploads p
      LEFT JOIN users u ON p.user_id = u.id
      ${searchCondition}
    `

    const countResult = await sql.unsafe(countQuery, searchParams_sql)
    const totalPhotos = Number.parseInt(countResult[0].total)

    console.log("Total photos found:", totalPhotos)

    // Get photos with pagination
    const photosQuery = `
      SELECT 
        p.id,
        p.filename,
        p.blob_url as url,
        p.uploaded_at,
        p.title,
        p.year,
        u.name as uploader_name,
        u.profile_image as uploader_profile_image,
        (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes l WHERE l.photo_id = p.id) as like_count
      FROM photo_uploads p
      LEFT JOIN users u ON p.user_id = u.id
      ${searchCondition}
      ORDER BY p.uploaded_at DESC
      LIMIT $${searchParams_sql.length + 1} OFFSET $${searchParams_sql.length + 2}
    `

    const photos = await sql.unsafe(photosQuery, [...searchParams_sql, limit, offset])

    console.log("Photos retrieved:", photos.length)

    // Calculate pagination info
    const totalPages = Math.ceil(totalPhotos / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'VIEW_PHOTOS',
        ${JSON.stringify({ page, limit, search, totalPhotos })},
        NOW()
      )
    `

    return NextResponse.json({
      photos,
      totalPhotos,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
    })
  } catch (error) {
    console.error("Admin photos GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("=== Admin Photos DELETE Request ===")

    // Get session from cookies
    const sessionCookie =
      request.cookies.get("session")?.value ||
      request.cookies.get("auth-session")?.value ||
      request.cookies.get("user-session")?.value

    console.log("Session cookie found:", !!sessionCookie)

    if (!sessionCookie) {
      console.log("No session cookie found")
      return NextResponse.json({ error: "No session found" }, { status: 401 })
    }

    // Verify admin session
    const sessionResult = await sql`
      SELECT us.*, u.role, u.name, u.email
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ${sessionCookie}
        AND us.expires_at > NOW()
        AND u.role = 'Admin'
    `

    console.log("Session query result:", sessionResult.length > 0 ? "Valid admin session" : "Invalid session")

    if (sessionResult.length === 0) {
      console.log("Invalid admin session or user not admin")
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const adminUser = sessionResult[0]
    console.log("Admin user:", adminUser.name, adminUser.email)

    const { photoIds } = await request.json()
    console.log("Photo IDs to delete:", photoIds)

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: "No photo IDs provided" }, { status: 400 })
    }

    // Get photo details before deletion for logging
    const photosToDelete = await sql`
      SELECT id, filename, blob_url, user_id
      FROM photo_uploads
      WHERE id = ANY(${photoIds})
    `

    console.log("Photos found for deletion:", photosToDelete.length)

    // Delete related data first (foreign key constraints)
    await sql`DELETE FROM likes WHERE photo_id = ANY(${photoIds})`
    await sql`DELETE FROM comments WHERE photo_id = ANY(${photoIds})`
    await sql`DELETE FROM photo_tags WHERE photo_id = ANY(${photoIds})`

    // Delete the photos
    const deleteResult = await sql`
      DELETE FROM photo_uploads
      WHERE id = ANY(${photoIds})
    `

    console.log("Photos deleted:", deleteResult.length)

    // Log admin action
    await sql`
      INSERT INTO admin_logs (admin_id, action, details, timestamp)
      VALUES (
        ${adminUser.user_id},
        'DELETE_PHOTOS',
        ${JSON.stringify({
          photoIds,
          deletedCount: deleteResult.length,
          photos: photosToDelete.map((p) => ({ id: p.id, filename: p.filename })),
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.length,
      message: `Successfully deleted ${deleteResult.length} photo(s)`,
    })
  } catch (error) {
    console.error("Admin photos DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
