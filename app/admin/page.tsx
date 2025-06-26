import { AdminDashboard } from "@/components/admin-dashboard"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

async function checkAdminAccess() {
  try {
    console.log("🔍 Admin page: Starting admin access check...")

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Admin page: No database URL")
      return { hasAccess: false, reason: "No database" }
    }

    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log(
      "🔍 Admin page: Received cookies:",
      allCookies.map((c) => `${c.name}=${c.value.substring(0, 15)}...`),
    )

    const sessionId =
      cookieStore.get("session")?.value ||
      cookieStore.get("auth-session")?.value ||
      cookieStore.get("user-session")?.value

    if (!sessionId) {
      console.log("🔍 Admin page: No session ID found in cookies")
      return { hasAccess: false, reason: "No session" }
    }

    console.log("🔍 Admin page: Using session ID:", sessionId.substring(0, 20) + "...")

    const sql = neon(process.env.DATABASE_URL)

    // Check session and user in one query
    const result = await sql`
      SELECT 
        u.id, u.name, u.email, u.role,
        s.expires_at, s.created_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
    `

    console.log("🔍 Admin page: Database query returned:", result.length, "results")

    if (result.length === 0) {
      console.log("🔍 Admin page: No session found in database")
      return { hasAccess: false, reason: "Session not found" }
    }

    const session = result[0]
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    console.log("🔍 Admin page: Session details:")
    console.log("  - User:", session.name)
    console.log("  - Email:", session.email)
    console.log("  - Role:", session.role)
    console.log("  - Expires:", expiresAt.toISOString())
    console.log("  - Current:", now.toISOString())
    console.log("  - Valid:", expiresAt > now)

    if (expiresAt <= now) {
      console.log("🔍 Admin page: Session expired")
      // Don't delete the session here - let the auth/me endpoint handle it
      return { hasAccess: false, reason: "Session expired" }
    }

    const isAdmin = session.role === "Admin"
    console.log("🔍 Admin page: Is admin?", isAdmin, "(role:", session.role, ")")

    return {
      hasAccess: isAdmin,
      reason: isAdmin ? "Admin access granted" : `Role is '${session.role}', need 'Admin'`,
      user: session,
    }
  } catch (error) {
    console.error("🔍 Admin page: Access check failed:", error)
    return { hasAccess: false, reason: "Database error" }
  }
}

export default async function AdminPage() {
  const accessCheck = await checkAdminAccess()

  console.log("🔍 Admin page: Access check result:", accessCheck)

  if (!accessCheck.hasAccess) {
    console.log("🔍 Admin page: Access denied -", accessCheck.reason)
    console.log("🔍 Admin page: Redirecting to home page")
    redirect("/")
  }

  console.log("🔍 Admin page: Access granted - rendering admin dashboard")

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded">
          <p className="text-green-800">
            ✅ Admin access granted for: {accessCheck.user?.name} ({accessCheck.user?.email})
          </p>
        </div>
        <AdminDashboard />
      </div>
    </div>
  )
}
