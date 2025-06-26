import { AdminDashboard } from "@/components/admin-dashboard"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

async function checkAdminAccess() {
  try {
    if (!process.env.DATABASE_URL) {
      return false
    }

    const cookieStore = await cookies()
    const sessionId =
      cookieStore.get("session")?.value ||
      cookieStore.get("auth-session")?.value ||
      cookieStore.get("user-session")?.value

    if (!sessionId) {
      return false
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if user has admin role
    const sessions = await sql`
      SELECT u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return false
    }

    return sessions[0].role === "Admin"
  } catch (error) {
    console.error("Admin access check failed:", error)
    return false
  }
}

export default async function AdminPage() {
  const hasAdminAccess = await checkAdminAccess()

  if (!hasAdminAccess) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto px-6 py-12">
        <AdminDashboard />
      </div>
    </div>
  )
}
