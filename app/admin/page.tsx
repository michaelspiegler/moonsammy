import { AdminDashboard } from "@/components/admin-dashboard"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

async function checkAdminAccess() {
  try {
    console.log("🔍 Admin page: Checking admin access...")

    if (!process.env.DATABASE_URL) {
      console.log("🔍 Admin page: No database URL")
      return false
    }

    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log(
      "🔍 Admin page: All cookies:",
      allCookies.map((c) => `${c.name}=${c.value.substring(0, 10)}...`),
    )

    const sessionId =
      cookieStore.get("session")?.value ||
      cookieStore.get("auth-session")?.value ||
      cookieStore.get("user-session")?.value

    console.log("🔍 Admin page: Session ID found:", sessionId ? "YES" : "NO")

    if (!sessionId) {
      console.log("🔍 Admin page: No session ID found")
      return false
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if user has admin role
    const sessions = await sql`
      SELECT u.role, u.name, u.email
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    console.log("🔍 Admin page: Database query returned:", sessions.length, "sessions")

    if (sessions.length === 0) {
      console.log("🔍 Admin page: No valid session found")
      return false
    }

    const user = sessions[0]
    console.log("🔍 Admin page: User found:", user.name, "role:", user.role)

    const isAdmin = user.role === "Admin"
    console.log("🔍 Admin page: Is admin?", isAdmin)

    return isAdmin
  } catch (error) {
    console.error("🔍 Admin page: Access check failed:", error)
    return false
  }
}

export default async function AdminPage() {
  const hasAdminAccess = await checkAdminAccess()

  console.log("🔍 Admin page: Final access decision:", hasAdminAccess)

  if (!hasAdminAccess) {
    console.log("🔍 Admin page: Redirecting to home")
    redirect("/")
  }

  console.log("🔍 Admin page: Rendering admin dashboard")

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto px-6 py-12">
        <AdminDashboard />
      </div>
    </div>
  )
}
