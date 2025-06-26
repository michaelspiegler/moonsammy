"use client"

import { useState, useEffect } from "react"
import { HeaderNav } from "@/components/header-nav"
import { InstagramFeed } from "@/components/instagram-feed"
import { ViewToggle } from "@/components/view-toggle"
import { UploadSection } from "@/components/upload-section"
import { DownloadSection } from "@/components/download-section"
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
      // Check multiple sources for session token
      const sessionToken =
        localStorage.getItem("sessionToken") ||
        localStorage.getItem("session") ||
        getCookie("sessionToken") ||
        getCookie("session") ||
        getCookie("auth-token")

      if (!sessionToken) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          Cookie: `sessionToken=${sessionToken}; session=${sessionToken}; auth-token=${sessionToken}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        // Clear invalid session data
        localStorage.removeItem("sessionToken")
        localStorage.removeItem("session")
        clearCookie("sessionToken")
        clearCookie("session")
        clearCookie("auth-token")
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(";").shift()
    return null
  }

  const clearCookie = (name: string) => {
    if (typeof document === "undefined") return
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  }

  const handleAuthSuccess = (userData: any) => {
    setUser(userData.user)
    setShowAuthModal(false)

    // Store session token in multiple places for reliability
    if (userData.sessionToken) {
      localStorage.setItem("sessionToken", userData.sessionToken)
      localStorage.setItem("session", userData.sessionToken)

      // Set multiple cookies for compatibility
      document.cookie = `sessionToken=${userData.sessionToken}; path=/; max-age=86400`
      document.cookie = `session=${userData.sessionToken}; path=/; max-age=86400`
      document.cookie = `auth-token=${userData.sessionToken}; path=/; max-age=86400`
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("sessionToken")
    localStorage.removeItem("session")
    clearCookie("sessionToken")
    clearCookie("session")
    clearCookie("auth-token")
  }

  if (loading) {
    return (
      <div className="main-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-container">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="header-nav-container mb-8">
          <HeaderNav user={user} onLogout={handleLogout} onAuthSuccess={handleAuthSuccess} />
        </div>

        {/* Memorial Header */}
        <div className="memorial-header-layout bg-white/50 backdrop-blur-sm rounded-xl p-8 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-gray-300 shadow-lg">
                <img src="/images/brian-portrait.png" alt="Brian Quain" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h1 className="memorial-title text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                Remembering Brian Quain
              </h1>
              <p className="text-xl text-gray-600 mb-4">Celebrating a life well lived</p>
              <p className="text-gray-700 max-w-2xl leading-relaxed">
                A beloved friend, colleague, and inspiration to many. This memorial gallery celebrates Brian's life
                through the memories and photos shared by those who knew him.
              </p>
            </div>
          </div>
        </div>

        {/* Auth Required Section */}
        {!user && (
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-8 mb-8 border border-gray-200 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sign in to continue</h2>
            <p className="text-gray-600 mb-6">Please sign in to view and share memories of Brian</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Create Account / Sign In
            </button>
          </div>
        )}

        {/* Main Content - Only show if authenticated */}
        {user && (
          <>
            {/* View Toggle */}
            <div className="mb-8">
              <ViewToggle />
            </div>

            {/* Upload Section */}
            <div className="mb-8">
              <UploadSection user={user} />
            </div>

            {/* Instagram Feed */}
            <div className="mb-8">
              <InstagramFeed />
            </div>

            {/* Download Section */}
            <div className="mb-8">
              <DownloadSection />
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p className="mb-2">In loving memory of Brian Quain</p>
            <p className="text-sm">
              This memorial gallery is maintained by friends and family. If you have photos or memories to share, please
              sign in and contribute.
            </p>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />}
    </div>
  )
}
