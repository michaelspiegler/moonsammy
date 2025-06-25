import { AdminLogin } from "@/components/admin-login"
import { AdminDashboard } from "@/components/admin-dashboard"
import { cookies } from "next/headers"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.get("admin-session")?.value === "authenticated"

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto px-6 py-12">{isLoggedIn ? <AdminDashboard /> : <AdminLogin />}</div>
    </div>
  )
}
