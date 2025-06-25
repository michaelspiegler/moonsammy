import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

async function getCurrentUser(request: NextRequest) {
  console.log("🔍 Upload API: Getting current user...")

  if (!process.env.DATABASE_URL) {
    console.log("🔍 Upload API: No database URL")
    return null
  }

  // Get ALL cookies and headers for debugging
  const allCookies = request.cookies.getAll()
  const allHeaders = Object.fromEntries(request.headers.entries())

  console.log(
    "🔍 Upload API: ALL COOKIES:",
    allCookies.map((c) => `${c.name}=${c.value?.substring(0, 30)}...`),
  )
  console.log("🔍 Upload API: RELEVANT HEADERS:", {
    "x-session-token": allHeaders["x-session-token"]?.substring(0, 30) + "..." || "missing",
    cookie: allHeaders["cookie"]?.substring(0, 100) + "..." || "missing",
  })

  // Try multiple ways to get session ID with better logging
  const sessionFromCookie = request.cookies.get("session")?.value
  const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
  const sessionFromUserCookie = request.cookies.get("user-session")?.value
  const sessionFromBackupCookie = request.cookies.get("backup-session")?.value
  const sessionFromHeader = request.headers.get("x-session-token")

  console.log("🔍 Upload API: Session sources:")
  console.log("  - session cookie:", sessionFromCookie ? sessionFromCookie.substring(0, 30) + "..." : "❌ MISSING")
  console.log(
    "  - auth-session cookie:",
    sessionFromAuthCookie ? sessionFromAuthCookie.substring(0, 30) + "..." : "❌ MISSING",
  )
  console.log(
    "  - user-session cookie:",
    sessionFromUserCookie ? sessionFromUserCookie.substring(0, 30) + "..." : "❌ MISSING",
  )
  console.log(
    "  - backup-session cookie:",
    sessionFromBackupCookie ? sessionFromBackupCookie.substring(0, 30) + "..." : "❌ MISSING",
  )
  console.log(
    "  - x-session-token header:",
    sessionFromHeader ? sessionFromHeader.substring(0, 30) + "..." : "❌ MISSING",
  )

  const sessionId =
    sessionFromCookie || sessionFromAuthCookie || sessionFromUserCookie || sessionFromBackupCookie || sessionFromHeader

  if (!sessionId) {
    console.log("🔍 Upload API: ❌ NO SESSION FOUND ANYWHERE")
    return null
  }

  console.log("🔍 Upload API: ✅ Using session ID:", sessionId.substring(0, 30) + "...")

  try {
    const sql = neon(process.env.DATABASE_URL)

    const sessions = await sql`
      SELECT u.id, u.name, u.email, u.profile_image_url, s.expires_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    console.log("🔍 Upload API: Found matching sessions:", sessions.length)

    if (sessions.length === 0) {
      console.log("🔍 Upload API: ❌ Session not found in database")
      return null
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    console.log("🔍 Upload API: Session validation:")
    console.log("  - expires at:", expiresAt.toISOString())
    console.log("  - current time:", now.toISOString())
    console.log("  - minutes until expiry:", Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60))

    if (expiresAt <= now) {
      console.log("🔍 Upload API: ❌ Session expired, cleaning up")
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return null
    }

    console.log("🔍 Upload API: ✅ Valid user found:", session.name, "ID:", session.id)
    return session
  } catch (error) {
    console.error("🔍 Upload API: ❌ Database error:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Upload API: ========== UPLOAD REQUEST START ==========")

    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: "Vercel Blob token not found. Please check the integration setup.",
        },
        { status: 400 },
      )
    }

    // Get current user - REQUIRED for upload
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      console.log("🔍 Upload API: ❌ Authentication failed - no current user")
      return NextResponse.json({ error: "Authentication required. Please sign in to upload photos." }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    // IMPORTANT: Use the authenticated user's actual data
    const uploaderName = currentUser.name
    const uploaderProfileImage = currentUser.profile_image_url
    const userId = currentUser.id

    console.log(
      `🔍 Upload: ✅ Authenticated user - Name: ${uploaderName}, ID: ${userId}, Profile: ${uploaderProfileImage ? "has image" : "no image"}`,
    )

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    console.log(`🔍 Upload: Starting upload of ${files.length} files by ${uploaderName} (ID: ${userId})`)

    // Process files one at a time to avoid rate limits
    const results = []
    const errors = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const timestamp = Date.now()
      const filename = `${timestamp}-${i.toString().padStart(3, "0")}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

      try {
        console.log(`🔍 Upload: Processing file ${i + 1}/${files.length}: ${filename} (${file.size} bytes)`)

        const blob = await put(filename, file, {
          access: "public",
        })

        console.log(`🔍 Upload: ✅ Successfully uploaded: ${filename} -> ${blob.url}`)

        // Save photo metadata to database
        if (process.env.DATABASE_URL) {
          try {
            const sql = neon(process.env.DATABASE_URL)

            console.log(`🔍 Upload: Saving metadata: name=${uploaderName}, userId=${userId}, blobId=${blob.pathname}`)

            // Insert into photo_uploads table with correct data
            await sql`
              INSERT INTO photo_uploads (id, uploader_name, uploader_profile_image, user_id, original_filename, blob_url, uploaded_at)
              VALUES (${blob.pathname}, ${uploaderName}, ${uploaderProfileImage}, ${userId}, ${file.name}, ${blob.url}, NOW())
              ON CONFLICT (id) DO UPDATE SET
                uploader_name = EXCLUDED.uploader_name,
                uploader_profile_image = EXCLUDED.uploader_profile_image,
                user_id = EXCLUDED.user_id,
                original_filename = EXCLUDED.original_filename,
                blob_url = EXCLUDED.blob_url,
                uploaded_at = EXCLUDED.uploaded_at
            `

            console.log(`🔍 Upload: ✅ Successfully saved metadata for ${blob.pathname}`)
          } catch (dbError) {
            console.error("🔍 Upload: ❌ Database save failed:", dbError)
            // Don't fail the upload if database save fails
          }
        }

        results.push(blob)

        // Add delay between uploads to respect rate limits
        if (i < files.length - 1) {
          console.log("🔍 Upload: Waiting 1 second before next upload...")
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`🔍 Upload: ❌ Failed to upload ${file.name}:`, error)
        errors.push({ file: file.name, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    console.log(
      `🔍 Upload: Completed - ${successCount} successful, ${errorCount} failed by ${uploaderName} (${userId})`,
    )

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

    // CRITICAL: FORCE set ALL session cookies in response
    const cookieOptions = {
      httpOnly: false,
      secure: false, // Keep false for development
      sameSite: "lax" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    }

    // Get the session ID that was used for authentication
    const sessionId =
      request.cookies.get("session")?.value ||
      request.cookies.get("auth-session")?.value ||
      request.cookies.get("user-session")?.value ||
      request.cookies.get("backup-session")?.value ||
      request.headers.get("x-session-token")

    if (sessionId) {
      console.log(`🔍 Upload: 🍪 FORCING response cookies with session: ${sessionId.substring(0, 30)}...`)
      console.log(`🔍 Upload: 🍪 Cookie options:`, cookieOptions)

      // Set ALL possible cookie variations
      response.cookies.set("session", sessionId, cookieOptions)
      response.cookies.set("auth-session", sessionId, cookieOptions)
      response.cookies.set("user-session", sessionId, cookieOptions)
      response.cookies.set("backup-session", sessionId, {
        ...cookieOptions,
        httpOnly: true, // Try httpOnly version too
      })

      console.log(`🔍 Upload: 🍪 ALL response cookies FORCED successfully`)
    } else {
      console.log(`🔍 Upload: ❌ No session ID found to preserve in response`)
    }

    console.log("🔍 Upload API: ========== UPLOAD REQUEST END ==========")
    return response
  } catch (error) {
    console.error("🔍 Upload: ❌ Upload error:", error)

    return NextResponse.json(
      {
        error: "Upload system error. Please sign in and try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
