import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

async function getCurrentUser(request: NextRequest) {
  console.log("🔍 Upload API: Getting current user...")

  if (!process.env.DATABASE_URL) {
    console.log("🔍 Upload API: No database URL")
    return null
  }

  // Try multiple ways to get session ID
  const sessionFromCookie = request.cookies.get("session")?.value
  const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
  const sessionFromHeader = request.headers.get("x-session-token")

  console.log("🔍 Upload API: Session from 'session' cookie:", sessionFromCookie ? "exists" : "missing")
  console.log("🔍 Upload API: Session from 'auth-session' cookie:", sessionFromAuthCookie ? "exists" : "missing")
  console.log("🔍 Upload API: Session from header:", sessionFromHeader ? "exists" : "missing")

  const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromHeader

  if (!sessionId) {
    console.log("🔍 Upload API: No session found")
    return null
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const sessions = await sql`
      SELECT u.id, u.name, u.email, u.profile_image_url, s.expires_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    console.log("🔍 Upload API: Found sessions:", sessions.length)

    if (sessions.length === 0) {
      console.log("🔍 Upload API: Session not found in database")
      return null
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (expiresAt <= now) {
      console.log("🔍 Upload API: Session expired")
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return null
    }

    console.log(
      "🔍 Upload API: Valid user found:",
      session.name,
      "Profile image:",
      session.profile_image_url ? "exists" : "none",
    )
    return session
  } catch (error) {
    console.error("🔍 Upload API: Database error:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: "Vercel Blob token not found. Please check the integration setup.",
        },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const uploaderName = formData.get("uploaderName") as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (!uploaderName || !uploaderName.trim()) {
      return NextResponse.json({ error: "Uploader name is required" }, { status: 400 })
    }

    // Get current user info if logged in
    const currentUser = await getCurrentUser(request)
    console.log("🔍 Upload: Current user data:", currentUser)

    console.log(`Starting upload of ${files.length} files by ${uploaderName}`)

    // Smaller batch size to avoid rate limits
    const batchSize = 3
    const results = []
    const errors = []

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(files.length / batchSize)

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`)

      try {
        const batchPromises = batch.map(async (file, index) => {
          const globalIndex = i + index
          const timestamp = Date.now()
          const filename = `${timestamp}-${globalIndex.toString().padStart(3, "0")}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

          try {
            const blob = await put(filename, file, {
              access: "public",
            })

            // Save photo metadata to database if available
            if (process.env.DATABASE_URL) {
              try {
                const sql = neon(process.env.DATABASE_URL)

                // Create photo_uploads table if it doesn't exist with all required columns
                await sql`
                  CREATE TABLE IF NOT EXISTS photo_uploads (
                    id TEXT PRIMARY KEY,
                    uploader_name TEXT NOT NULL,
                    uploader_profile_image TEXT,
                    user_id TEXT,
                    original_filename TEXT NOT NULL,
                    blob_url TEXT NOT NULL,
                    uploaded_at TIMESTAMP DEFAULT NOW()
                  )
                `

                // Add missing columns if they don't exist
                try {
                  await sql`ALTER TABLE photo_uploads ADD COLUMN IF NOT EXISTS uploader_profile_image TEXT`
                  await sql`ALTER TABLE photo_uploads ADD COLUMN IF NOT EXISTS user_id TEXT`
                } catch (alterError) {
                  console.log("Columns may already exist")
                }

                const profileImageUrl = currentUser?.profile_image_url || null
                const userId = currentUser?.id || null

                console.log(
                  `🔍 Saving upload metadata: name=${uploaderName}, profileImage=${profileImageUrl}, userId=${userId}`,
                )

                // Save the upload info with profile image
                await sql`
                  INSERT INTO photo_uploads (id, uploader_name, uploader_profile_image, user_id, original_filename, blob_url, uploaded_at)
                  VALUES (${blob.pathname}, ${uploaderName.trim()}, ${profileImageUrl}, ${userId}, ${file.name}, ${blob.url}, NOW())
                  ON CONFLICT (id) DO UPDATE SET
                    uploader_name = ${uploaderName.trim()},
                    uploader_profile_image = ${profileImageUrl},
                    user_id = ${userId},
                    original_filename = ${file.name},
                    blob_url = ${blob.url}
                `

                console.log(`🔍 Successfully saved upload metadata for ${blob.pathname}`)
              } catch (dbError) {
                console.error("🔍 Database save failed:", dbError)
              }
            }

            return { success: true, blob, originalName: file.name }
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error)

            // Handle specific Blob errors
            if (error instanceof Error) {
              if (error.message.includes("Too Many Requests") || error.message.includes("rate limit")) {
                return {
                  success: false,
                  error: "Rate limit reached - please wait and try again",
                  originalName: file.name,
                }
              }

              if (error.message.includes("quota") || error.message.includes("limit exceeded")) {
                return {
                  success: false,
                  error: "Storage quota exceeded",
                  originalName: file.name,
                }
              }
            }

            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
              originalName: file.name,
            }
          }
        })

        const batchResults = await Promise.all(batchPromises)

        // Separate successful uploads from errors
        batchResults.forEach((result) => {
          if (result.success) {
            results.push(result.blob)
          } else {
            errors.push({ file: result.originalName, error: result.error })
          }
        })

        // Longer delay between batches to respect rate limits
        if (i + batchSize < files.length) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (batchError) {
        console.error(`Batch ${batchNumber} failed:`, batchError)

        // Check if it's a rate limit error
        if (
          batchError instanceof Error &&
          (batchError.message.includes("Too Many Requests") || batchError.message.includes("rate limit"))
        ) {
          return NextResponse.json(
            {
              error: "Upload rate limit reached. Please wait a moment and try uploading fewer files.",
              successCount: results.length,
              errorCount: files.length - results.length,
            },
            { status: 429 },
          )
        }

        // Add all files in this batch to errors
        batch.forEach((file) => {
          errors.push({ file: file.name, error: "Batch processing failed" })
        })
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    console.log(`Upload completed: ${successCount} successful, ${errorCount} failed by ${uploaderName}`)

    // Create response that preserves session cookies
    const response = NextResponse.json({
      success: successCount > 0,
      files: results,
      successCount,
      errorCount,
      errors: errors.slice(0, 5),
      message:
        errorCount === 0
          ? `Successfully uploaded all ${successCount} files!`
          : `Uploaded ${successCount} files successfully. ${errorCount} files failed.`,
    })

    // Preserve session cookies in response
    const sessionFromCookie = request.cookies.get("session")?.value
    const sessionFromAuthCookie = request.cookies.get("auth-session")?.value

    if (sessionFromCookie) {
      response.cookies.set("session", sessionFromCookie, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      })
    }

    if (sessionFromAuthCookie) {
      response.cookies.set("auth-session", sessionFromAuthCookie, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      })
    }

    return response
  } catch (error) {
    console.error("Upload error:", error)

    // Handle rate limit errors at the top level
    if (
      error instanceof Error &&
      (error.message.includes("Too Many Requests") || error.message.includes("rate limit"))
    ) {
      return NextResponse.json(
        {
          error: "Upload service temporarily unavailable due to rate limits. Please wait and try again.",
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      {
        error: "Upload system error. Please try again with fewer files.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
