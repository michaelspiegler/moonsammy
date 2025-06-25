import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { del } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-session")?.value === "authenticated"
}

async function logAdminAction(sql: any, action: string, targetType: string, targetId: string, details: any = {}) {
  try {
    await sql`
      INSERT INTO admin_logs (action, target_type, target_id, details)
      VALUES (${action}, ${targetType}, ${targetId}, ${JSON.stringify(details)})
    `
  } catch (error) {
    console.error("Failed to log admin action:", error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const photoId = params.id
    console.log("🗑️ Admin deleting photo:", photoId)

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // First, get photo details for logging
    const photoDetails = await sql`
      SELECT 
        pm.title,
        pm.year,
        pu.original_filename,
        pu.blob_url,
        pu.user_id,
        u.name as uploader_name,
        (SELECT COUNT(*) FROM comments WHERE photo_id = ${photoId}) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE photo_id = ${photoId}) as like_count,
        (SELECT array_agg(tag_name) FROM photo_tags WHERE photo_id = ${photoId}) as tags
      FROM photo_metadata pm
      LEFT JOIN photo_uploads pu ON pm.id = pu.id
      LEFT JOIN users u ON pu.user_id = u.id
      WHERE pm.id = ${photoId}
    `

    const photoInfo = photoDetails[0] || {}

    // Start transaction for complete cleanup
    await sql`BEGIN`

    try {
      // Delete all related data in correct order
      console.log("🗑️ Deleting comments...")
      const deletedComments = await sql`DELETE FROM comments WHERE photo_id = ${photoId} RETURNING id`

      console.log("🗑️ Deleting likes...")
      const deletedLikes = await sql`DELETE FROM likes WHERE photo_id = ${photoId} RETURNING id`

      console.log("🗑️ Deleting photo tags...")
      const deletedTags = await sql`DELETE FROM photo_tags WHERE photo_id = ${photoId} RETURNING tag_name`

      console.log("🗑️ Deleting photo uploads record...")
      const deletedUploads = await sql`DELETE FROM photo_uploads WHERE id = ${photoId} RETURNING id`

      console.log("🗑️ Deleting photo metadata...")
      const deletedMetadata = await sql`DELETE FROM photo_metadata WHERE id = ${photoId} RETURNING id`

      // Log the deletion with full details
      await logAdminAction(sql, "DELETE_PHOTO", "photo", photoId, {
        title: photoInfo.title,
        filename: photoInfo.original_filename,
        uploader: photoInfo.uploader_name,
        year: photoInfo.year,
        tags: photoInfo.tags || [],
        comments_deleted: deletedComments.length,
        likes_deleted: deletedLikes.length,
        tags_deleted: deletedTags.map((t) => t.tag_name),
        blob_url: photoInfo.blob_url,
      })

      // Commit transaction
      await sql`COMMIT`

      console.log("🗑️ Database cleanup completed successfully")

      // Delete from Vercel Blob (do this after DB to ensure we have the URL)
      if (photoInfo.blob_url) {
        try {
          await del(photoInfo.blob_url)
          console.log("🗑️ Blob deleted successfully")
        } catch (blobError) {
          console.error("🗑️ Failed to delete blob:", blobError)
          // Log blob deletion failure
          await logAdminAction(sql, "DELETE_PHOTO_BLOB_FAILED", "photo", photoId, {
            error: blobError.message,
            blob_url: photoInfo.blob_url,
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Photo and all related data deleted successfully`,
        details: {
          comments_deleted: deletedComments.length,
          likes_deleted: deletedLikes.length,
          tags_deleted: deletedTags.length,
          uploads_deleted: deletedUploads.length,
        },
      })
    } catch (dbError) {
      // Rollback transaction on error
      await sql`ROLLBACK`
      throw dbError
    }
  } catch (error) {
    console.error("🗑️ Error deleting photo:", error)

    // Try to log the error if possible
    if (process.env.DATABASE_URL) {
      try {
        const sql = neon(process.env.DATABASE_URL)
        await logAdminAction(sql, "DELETE_PHOTO_FAILED", "photo", params.id, {
          error: error.message,
        })
      } catch (logError) {
        console.error("Failed to log deletion error:", logError)
      }
    }

    return NextResponse.json(
      {
        error: "Failed to delete photo and related data",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
