"use client"

import { useState, useEffect } from "react"
import { HeaderNav } from "@/components/header-nav"
import { InstagramFeed } from "@/components/instagram-feed"
import { ViewToggle } from "@/components/view-toggle"
import { UploadSection } from "@/components/upload-section"
import { DownloadSection } from "@/components/download-section"
import { AuthModal } from "@/components/auth-modal"
import { useTheme } from "@/components/theme-provider"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { theme } = useTheme()

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    checkAuth() // Re-check auth to get updated user state
  }

  const handleLogout = () => {
    setUser(null)
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
      <header className="container mx-auto px-4 py-8">
        <HeaderNav user={user} onLogout={handleLogout} onLoginClick={() => setShowAuthModal(true)} />
      </header>

      <main>
        <div className="container mx-auto px-4">
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
              <div className="mb-8">
                <ViewToggle />
              </div>
              <div className="mb-8">
                <UploadSection user={user} />
              </div>
              <div className="mb-8">
                <InstagramFeed />
              </div>
              <div className="mb-8">
                <DownloadSection />
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="mt-16 pt-8 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">In loving memory of Brian Quain</p>
          <p className="text-sm">
            This memorial gallery is maintained by friends and family. If you have photos or memories to share, please
            sign in and contribute.
          </p>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
