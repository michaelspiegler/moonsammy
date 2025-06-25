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

    // First, get photo details for logging BEFORE deletion
    const photoDetails = await sql`
      SELECT 
        pm.id,
        pm.title,
        pm.year,
        pu.original_filename,
        pu.blob_url,
        pu.user_id,
        u.name as uploader_name,
        u.email as uploader_email
      FROM photo_metadata pm
      LEFT JOIN photo_uploads pu ON pm.id = pu.id
      LEFT JOIN users u ON pu.user_id = u.id
      WHERE pm.id = ${photoId}
    `

    if (photoDetails.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const photoInfo = photoDetails[0]

    // Get counts of related data before deletion
    const [commentCount] = await sql`SELECT COUNT(*) as count FROM comments WHERE photo_id = ${photoId}`
    const [likeCount] = await sql`SELECT COUNT(*) as count FROM likes WHERE photo_id = ${photoId}`
    const tagsList = await sql`SELECT tag_name FROM photo_tags WHERE photo_id = ${photoId}`

    console.log("🗑️ Photo details:", {
      id: photoInfo.id,
      title: photoInfo.title,
      filename: photoInfo.original_filename,
      uploader: photoInfo.uploader_name,
      comments: commentCount.count,
      likes: likeCount.count,
      tags: tagsList.length,
    })

    // Start transaction for complete cleanup
    await sql`BEGIN`

    try {
      // Delete in the correct order to avoid foreign key constraints
      console.log("🗑️ Step 1: Deleting comments...")
      const deletedComments = await sql`DELETE FROM comments WHERE photo_id = ${photoId} RETURNING id`

      console.log("🗑️ Step 2: Deleting likes...")
      const deletedLikes = await sql`DELETE FROM likes WHERE photo_id = ${photoId} RETURNING id`

      console.log("🗑️ Step 3: Deleting photo tags...")
      const deletedTags = await sql`DELETE FROM photo_tags WHERE photo_id = ${photoId} RETURNING tag_name`

      console.log("🗑️ Step 4: Deleting photo uploads record...")
      const deletedUploads = await sql`DELETE FROM photo_uploads WHERE id = ${photoId} RETURNING id, blob_url`

      console.log("🗑️ Step 5: Deleting photo metadata (main record)...")
      const deletedMetadata = await sql`DELETE FROM photo_metadata WHERE id = ${photoId} RETURNING id`

      // Verify deletion was successful
      if (deletedMetadata.length === 0) {
        throw new Error("Failed to delete photo metadata - photo may not exist")
      }

      // Log the deletion with full details
      await logAdminAction(sql, "DELETE_PHOTO", "photo", photoId, {
        title: photoInfo.title,
        filename: photoInfo.original_filename,
        uploader: photoInfo.uploader_name,
        uploader_email: photoInfo.uploader_email,
        year: photoInfo.year,
        tags: tagsList.map((t) => t.tag_name),
        comments_deleted: deletedComments.length,
        likes_deleted: deletedLikes.length,
        tags_deleted: deletedTags.map((t) => t.tag_name),
        uploads_deleted: deletedUploads.length,
        blob_url: photoInfo.blob_url,
        deleted_at: new Date().toISOString(),
      })

      // Commit transaction
      await sql`COMMIT`

      console.log("🗑️ Database cleanup completed successfully:", {
        comments: deletedComments.length,
        likes: deletedLikes.length,
        tags: deletedTags.length,
        uploads: deletedUploads.length,
        metadata: deletedMetadata.length,
      })

      // Delete from Vercel Blob (do this after DB commit)
      if (photoInfo.blob_url) {
        try {
          console.log("🗑️ Deleting blob:", photoInfo.blob_url)
          await del(photoInfo.blob_url)
          console.log("🗑️ Blob deleted successfully")
        } catch (blobError) {
          console.error("🗑️ Failed to delete blob:", blobError)
          // Log blob deletion failure but don't fail the whole operation
          await logAdminAction(sql, "DELETE_PHOTO_BLOB_FAILED", "photo", photoId, {
            error: blobError.message,
            blob_url: photoInfo.blob_url,
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Photo "${photoInfo.title || photoInfo.original_filename}" and all related data deleted successfully`,
        details: {
          photo_id: photoId,
          comments_deleted: deletedComments.length,
          likes_deleted: deletedLikes.length,
          tags_deleted: deletedTags.length,
          uploads_deleted: deletedUploads.length,
          blob_deleted: !!photoInfo.blob_url,
        },
      })
    } catch (dbError) {
      // Rollback transaction on error
      await sql`ROLLBACK`
      console.error("🗑️ Database error during deletion:", dbError)
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
          stack: error.stack,
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
