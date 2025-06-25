import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"

async function getCurrentUser(request: NextRequest) {
  console.log("🔍 Profile API: Getting current user...")

  if (!process.env.DATABASE_URL) {
    console.log("🔍 Profile API: No database URL")
    return null
  }

  // Try multiple ways to get session ID
  const sessionFromCookie = request.cookies.get("session")?.value
  const sessionFromAuthCookie = request.cookies.get("auth-session")?.value
  const sessionFromHeader = request.headers.get("x-session-token")

  console.log("🔍 Profile API: Session from 'session' cookie:", sessionFromCookie ? "exists" : "missing")
  console.log("🔍 Profile API: Session from 'auth-session' cookie:", sessionFromAuthCookie ? "exists" : "missing")
  console.log("🔍 Profile API: Session from header:", sessionFromHeader ? "exists" : "missing")

  const sessionId = sessionFromCookie || sessionFromAuthCookie || sessionFromHeader

  // Debug: Log all cookies and headers
  const allCookies = request.cookies.getAll()
  console.log(
    "🔍 Profile API: All cookies:",
    allCookies.map((c) => `${c.name}=${c.value.substring(0, 10)}...`),
  )

  if (!sessionId) {
    console.log("🔍 Profile API: No session found anywhere")
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

    console.log("🔍 Profile API: Found sessions:", sessions.length)

    if (sessions.length === 0) {
      console.log("🔍 Profile API: Session not found in database")
      return null
    }

    const session = sessions[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (expiresAt <= now) {
      console.log("🔍 Profile API: Session expired")
      await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`
      return null
    }

    console.log("🔍 Profile API: Valid user found:", session.name, "ID:", session.id)
    return session
  } catch (error) {
    console.error("🔍 Profile API: Database error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Profile API GET: Starting...")
    console.log("🔍 Profile API GET: Request URL:", request.url)

    const user = await getCurrentUser(request)

    if (!user) {
      console.log("🔍 Profile API GET: No user found, returning 401")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 Profile API GET: Returning user data")
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profile_image_url,
      },
    })
  } catch (error) {
    console.error("🔍 Profile API GET: Error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const formData = await request.formData()
    const name = formData.get("name") as string
    const profileImage = formData.get("profileImage") as File | null

    if (!name?.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    let profileImageUrl = user.profile_image_url

    // Upload new profile image if provided
    if (profileImage && profileImage.size > 0) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "Image upload not configured" }, { status: 500 })
      }

      const timestamp = Date.now()
      // Use "profile-" prefix to distinguish from gallery photos
      const filename = `profile-${user.id}-${timestamp}-${profileImage.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

      const blob = await put(filename, profileImage, {
        access: "public",
      })

      profileImageUrl = blob.url
    }

    console.log(`🔍 Profile Update: Updating user ${user.id} (${user.name}) with new profile image: ${profileImageUrl}`)

    // Update user profile
    await sql`
      UPDATE users 
      SET name = ${name.trim()}, 
          profile_image_url = ${profileImageUrl},
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    // FIXED: Only update photo uploads for THIS specific user
    if (profileImageUrl !== user.profile_image_url) {
      console.log(`🔄 Updating profile image for uploads by user ${user.id} only...`)

      try {
        // Update ONLY this user's photo uploads with the new profile image
        const updateResult = await sql`
          UPDATE photo_uploads 
          SET uploader_profile_image = ${profileImageUrl}
          WHERE user_id = ${user.id}
        `

        console.log(`✅ Updated profile image for ${updateResult.length || 0} uploads by user ${user.id}`)
      } catch (updateError) {
        console.error("❌ Failed to update uploads profile image:", updateError)
        // Don't fail the whole request if this update fails
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: name.trim(),
        email: user.email,
        profileImage: profileImageUrl,
      },
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
