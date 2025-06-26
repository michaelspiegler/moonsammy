"use client"

import { useState, useEffect } from "react"
import { InstagramFeed } from "@/components/instagram-feed"
import { UploadSection } from "@/components/upload-section"
import { DownloadSection } from "@/components/download-section"
import { ViewToggle } from "@/components/view-toggle"
import { HeaderNav } from "@/components/header-nav"
import { AuthModal } from "@/components/auth-modal"
import Image from "next/image"

interface User {
  id: string
  name: string
  email: string
  role: string
  profileImage?: string
  sessionToken?: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log("🔍 Home: Checking authentication...")

      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {}

      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        headers,
      })

      const data = await response.json()
      console.log("🔍 Home: Auth response:", data)

      if (data.user) {
        setUser(data.user)
        // Store session token if provided
        if (data.user.sessionToken) {
          localStorage.setItem("sessionToken", data.user.sessionToken)
        }
      } else {
        setUser(null)
        localStorage.removeItem("sessionToken")
      }
    } catch (error) {
      console.error("🔍 Home: Auth check failed:", error)
      setUser(null)
      localStorage.removeItem("sessionToken")
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = (userData: User) => {
    console.log("🔍 Home: Auth success:", userData)
    setUser(userData)
    setShowAuthModal(false)

    // Store session token
    if (userData.sessionToken) {
      localStorage.setItem("sessionToken", userData.sessionToken)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      localStorage.removeItem("sessionToken")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mb-4"></div>
          <p className="text-gray-600 font-light">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen theme-bg">
      {/* Fixed Header */}
      <div className="header-nav-container">
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-[999998]">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image
                  src="/images/brian-portrait.png"
                  alt="Brian Quain"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 font-serif">Brian Quain Memorial</h1>
                  <p className="text-sm text-gray-600 font-light">Celebrating a life well lived</p>
                </div>
              </div>
              <HeaderNav user={user} onLogin={() => setShowAuthModal(true)} onLogout={handleLogout} />
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="pt-20">
        {!user ? (
          // Not logged in - show memorial intro
          <div className="container mx-auto px-6 py-12">
            {/* Memorial Header */}
            <div className="text-center mb-16">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-12 mb-12">
                <div className="flex-shrink-0">
                  <Image
                    src="/images/brian-portrait.png"
                    alt="Brian Quain"
                    width={300}
                    height={300}
                    className="rounded-full shadow-2xl"
                  />
                </div>
                <div className="text-center lg:text-left max-w-2xl">
                  <h1 className="text-5xl lg:text-6xl font-light text-gray-800 mb-6 font-serif">
                    Remembering Brian Quain
                  </h1>
                  <p className="text-xl text-gray-600 mb-8 font-light leading-relaxed">
                    A celebration of Brian's life through the memories, photos, and stories shared by those who knew and
                    loved him.
                  </p>
                  <div className="space-y-4">
                    <p className="text-lg text-gray-700 font-light">
                      Join us in honoring Brian's memory by sharing your photos and stories.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sign in to continue */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-gray-200 shadow-lg">
                <h3 className="text-2xl font-light text-gray-800 mb-4 font-serif">Sign in to continue</h3>
                <p className="text-gray-600 mb-6 font-light">
                  Access the memory feed, share photos, and connect with others celebrating Brian's life.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-light"
                >
                  Create Account / Sign In
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Logged in - show full app
          <div className="container mx-auto px-6 py-12">
            {/* Welcome Header */}
            <div className="text-center mb-12">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-12 mb-8">
                <div className="flex-shrink-0">
                  <Image
                    src="/images/brian-portrait.png"
                    alt="Brian Quain"
                    width={200}
                    height={200}
                    className="rounded-full shadow-xl"
                  />
                </div>
                <div className="text-center lg:text-left">
                  <h1 className="text-4xl lg:text-5xl font-light text-gray-800 mb-4 font-serif">
                    Remembering Brian Quain
                  </h1>
                  <p className="text-lg text-gray-600 font-light">
                    Welcome back, {user.name}. Share your memories and explore the collection.
                  </p>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="mb-8">
              <ViewToggle />
            </div>

            {/* Upload Section */}
            <div className="mb-12">
              <UploadSection user={user} />
            </div>

            {/* Main Feed */}
            <InstagramFeed user={user} />

            {/* Download Section */}
            <div className="mt-16">
              <DownloadSection />
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
