import { list } from "@vercel/blob"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    console.log("📸 Photos API: Starting photo fetch")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "24")
    const offset = (page - 1) * limit

    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("📸 Photos API: No blob token found")
      return NextResponse.json(
        {
          photos: [],
          totalPhotos: 0,
          currentPage: page,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          error: "Vercel Blob token not found. Please check the integration setup.",
        },
        { status: 200 },
      )
    }

    let blobs = []

    try {
      console.log("📸 Photos API: Fetching blob list...")
      const blobResult = await list()
      blobs = blobResult.blobs
      console.log("📸 Photos API: Found blobs:", blobs.length)
    } catch (blobError) {
      console.error("📸 Photos API: Blob API error:", blobError)
      return NextResponse.json(
        {
          photos: [],
          totalPhotos: 0,
          currentPage: page,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          error: "Unable to fetch photos at this time. Please try again later.",
        },
        { status: 200 },
      )
    }

    // Filter out profile pictures from gallery (exclude files starting with "profile-")
    const galleryBlobs = blobs.filter((blob) => !blob.pathname.startsWith("profile-"))

    // Sort by upload date, newest first
    galleryBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    const totalPhotos = galleryBlobs.length
    const totalPages = Math.ceil(totalPhotos / limit)
    const paginatedBlobs = galleryBlobs.slice(offset, offset + limit)

    const photos = paginatedBlobs.map((blob) => ({
      id: blob.pathname,
      url: blob.url,
      filename: blob.pathname.split("-").slice(2).join("-") || blob.pathname,
      uploadedAt: blob.uploadedAt,
      uploaderName: "",
      uploaderProfileImage: null,
      title: "",
      year: null,
      tags: [],
      comments: [],
      likes: 0,
    }))

    // Try to get metadata from database if available
    if (process.env.DATABASE_URL && photos.length > 0) {
      try {
        console.log("📸 Photos API: Fetching database metadata...")
        const sql = neon(process.env.DATABASE_URL)

        // Get photo IDs for current page
        const photoIds = photos.map((p) => p.id)

        // Fetch all metadata in parallel with error handling
        const [metadata, comments, likes, uploads, photoTagsData] = await Promise.allSettled([
          sql`SELECT * FROM photo_metadata WHERE id = ANY(${photoIds})`.catch(() => []),
          sql`SELECT * FROM comments WHERE photo_id = ANY(${photoIds}) ORDER BY created_at ASC`.catch(() => []),
          sql`SELECT photo_id, COUNT(*) as count FROM likes WHERE photo_id = ANY(${photoIds}) GROUP BY photo_id`.catch(
            () => [],
          ),
          sql`SELECT * FROM photo_uploads WHERE id = ANY(${photoIds})`.catch(() => []),
          sql`
            SELECT pt.photo_id, t.id as tag_id, t.name as tag_name
            FROM photo_tags pt
            JOIN tags t ON pt.tag_id = t.id
            WHERE pt.photo_id = ANY(${photoIds})
            ORDER BY t.name
          `.catch(() => []),
        ])

        // Extract successful results
        const metadataResults = metadata.status === "fulfilled" ? metadata.value : []
        const commentsResults = comments.status === "fulfilled" ? comments.value : []
        const likesResults = likes.status === "fulfilled" ? likes.value : []
        const uploadsResults = uploads.status === "fulfilled" ? uploads.value : []
        const tagsResults = photoTagsData.status === "fulfilled" ? photoTagsData.value : []

        // Merge metadata with photos
        const photosWithMetadata = photos.map((photo) => {
          const meta = metadataResults.find((m) => m.id === photo.id)
          const upload = uploadsResults.find((u) => u.id === photo.id)
          const photoComments = commentsResults
            .filter((c) => c.photo_id === photo.id)
            .map((c) => ({
              id: c.id,
              author: c.author,
              content: c.content,
              created_at: c.created_at,
            }))
          const photoLikes = likesResults.find((l) => l.photo_id === photo.id)
          const photoTags = tagsResults
            .filter((pt) => pt.photo_id === photo.id)
            .map((pt) => ({
              id: pt.tag_id,
              name: pt.tag_name,
            }))

          return {
            ...photo,
            uploaderName: upload?.uploader_name || "",
            uploaderProfileImage: upload?.uploader_profile_image || null,
            title: meta?.title || "",
            year: meta?.year || null,
            tags: photoTags,
            comments: photoComments,
            likes: photoLikes?.count || 0,
          }
        })

        console.log("📸 Photos API: Successfully merged metadata")
        return NextResponse.json(
          {
            photos: photosWithMetadata,
            totalPhotos,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
          { status: 200 },
        )
      } catch (dbError) {
        console.error("📸 Photos API: Database error:", dbError)
        // Continue with blob-only data
      }
    }

    console.log("📸 Photos API: Returning blob-only data")
    return NextResponse.json(
      {
        photos,
        totalPhotos,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("📸 Photos API: Unexpected error:", error)
    return NextResponse.json(
      {
        photos: [],
        totalPhotos: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        error: "Unable to load photos. Please try refreshing the page.",
      },
      { status: 200 },
    )
  }
}
