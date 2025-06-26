"use client"

import { useState, useEffect } from "react"
import { HeaderNav } from "@/components/header-nav"
import { InstagramFeed } from "@/components/instagram-feed"
import { ViewToggle } from "@/components/view-toggle"
import { UploadSection } from "@/components/upload-section"
import { DownloadSection } from "@/components/download-section"
import { ThemeSelector } from "@/components/theme-selector"
import { AuthModal } from "@/components/auth-modal"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const sessionToken =
        localStorage.getItem("sessionToken") ||
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("sessionToken="))
          ?.split("=")[1] ||
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("session="))
          ?.split("=")[1]

      if (!sessionToken) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          Cookie: `sessionToken=${sessionToken}; session=${sessionToken}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = (userData: any) => {
    setUser(userData)
    setShowAuthModal(false)
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      localStorage.removeItem("sessionToken")
      document.cookie = "sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      setUser(null)
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen theme-bg">
      <HeaderNav user={user} onAuthClick={() => setShowAuthModal(true)} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8">
        {/* Memorial Header */}
        <div className="text-center mb-12">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-[#D4AF37] shadow-2xl">
              <img src="/images/brian-portrait.png" alt="Brian Quain" className="w-full h-full object-cover" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#D4AF37] mb-4">Remembering Brian Quain</h1>
              <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
                Celebrating a life well lived through shared memories, photographs, and stories
              </p>
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="mb-8">
          <ThemeSelector />
        </div>

        {user ? (
          <>
            {/* Upload Section */}
            <div className="mb-12">
              <UploadSection />
            </div>

            {/* View Toggle and Gallery */}
            <div className="mb-8">
              <ViewToggle />
            </div>

            <InstagramFeed />

            {/* Download Section */}
            <div className="mt-12">
              <DownloadSection />
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 max-w-md mx-auto border border-gray-700">
              <h2 className="text-2xl font-serif font-semibold text-[#D4AF37] mb-4">Sign in to continue</h2>
              <p className="text-gray-300 mb-6">Please sign in to view and share memories of Brian</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] px-6 py-3 rounded-lg hover:bg-[#D4AF37] hover:text-gray-900 transition-all duration-200 font-serif"
              >
                Create Account / Sign In
              </button>
            </div>
          </div>
        )}
      </main>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />}
    </div>
  )
}
