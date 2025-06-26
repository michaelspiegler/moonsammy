"use client"

import { useState, useEffect } from "react"
import { PhotoGallery } from "@/components/photo-gallery"
import { UploadSection } from "@/components/upload-section"
import { ViewToggle } from "@/components/view-toggle"
import { SlideshowView } from "@/components/slideshow-view"
import { ThemeSelector } from "@/components/theme-selector"
import { HeaderNav } from "@/components/header-nav"
import { AuthModal } from "@/components/auth-modal"
import Image from "next/image"

export default function Home() {
  const [view, setView] = useState<"gallery" | "slideshow">("gallery")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")
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
      setUser(null)
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mb-4"></div>
          <p className="text-gray-500 font-light">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-b border-border z-[999998]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Image
              src="/images/brian-portrait.png"
              alt="Brian Quain"
              width={40}
              height={40}
              className="rounded-full border-2 border-gray-300"
            />
            <div>
              <h1 className="text-xl font-serif text-gray-800">Brian Quain Memorial</h1>
              <p className="text-sm text-gray-600 font-light">Celebrating a life well lived</p>
            </div>
          </div>

          <div className="header-nav-container z-[999999]">
            <HeaderNav user={user} onLogout={handleLogout} onAuthClick={() => setShowAuthModal(true)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {!user ? (
            // Not logged in - show sign in prompt
            <div className="text-center py-20">
              <div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-8 shadow-lg">
                <Image
                  src="/images/brian-portrait.png"
                  alt="Brian Quain"
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-gray-300 mx-auto mb-6"
                />
                <h2 className="text-2xl font-serif text-gray-800 mb-4">Welcome to Brian's Memorial</h2>
                <p className="text-gray-600 font-light mb-6">Sign in to view and share memories of Brian Quain</p>

                <div className="header-nav-container z-[999999]">
                  <HeaderNav
                    user={user}
                    onLogout={handleLogout}
                    onAuthClick={() => setShowAuthModal(true)}
                    showAsButton={true}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Logged in - show main content
            <>
              {/* Header Section */}
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <Image
                    src="/images/brian-portrait.png"
                    alt="Brian Quain"
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-gray-300 shadow-lg"
                  />
                </div>
                <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">Remembering Brian Quain</h1>
                <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto mb-8">
                  A celebration of life, love, and the memories we shared together
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                  <ViewToggle view={view} onViewChange={setView} />
                  <ThemeSelector />
                </div>
              </div>

              {/* Upload Section */}
              <UploadSection onUploadSuccess={() => window.location.reload()} />

              {/* Content based on view */}
              {view === "gallery" ? <PhotoGallery /> : <SlideshowView />}
            </>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
