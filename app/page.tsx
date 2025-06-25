"use client"

import { useState, useEffect } from "react"
import { UploadSection } from "@/components/upload-section"
import { DownloadSection } from "@/components/download-section"
import { ViewToggle } from "@/components/view-toggle"
import { HeaderNav } from "@/components/header-nav"
import { Lock } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const { theme } = useTheme()

  // Check auth status on mount and after any potential session changes
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        console.log("🔍 Main page: Starting initial auth check...")

        // Get session token from localStorage as backup
        const sessionToken = localStorage.getItem("sessionToken")
        console.log("🔍 Main page: Session token from localStorage:", sessionToken ? "exists" : "missing")

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }
        if (sessionToken) {
          headers["x-session-token"] = sessionToken
        }

        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store", // Prevent caching
          headers,
        })

        console.log("🔍 Main page: Auth response status:", response.status)

        const data = await response.json()
        console.log("🔍 Main page: Auth response data:", data)

        if (data.user) {
          console.log("🔍 Main page: Initial auth check found user:", data.user.name)
          setUser(data.user)
        } else {
          console.log("🔍 Main page: Initial auth check: no user found")
          setUser(null)
        }
      } catch (error) {
        console.error("🔍 Main page: Initial auth check failed:", error)
        setUser(null)
      } finally {
        setAuthChecked(true)
      }
    }

    checkInitialAuth()

    // Also check auth when the page becomes visible (handles tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("🔍 Main page: Page became visible, rechecking auth...")
        checkInitialAuth()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const handleAuthChange = (userData: any) => {
    console.log("🔍 Main page: Auth change received:", userData?.name || "null")
    setUser(userData)

    // Store session token if provided
    if (userData && userData.sessionToken) {
      localStorage.setItem("sessionToken", userData.sessionToken)
      console.log("🔍 Main page: Stored session token in localStorage")
    } else if (!userData) {
      localStorage.removeItem("sessionToken")
      console.log("🔍 Main page: Removed session token from localStorage")
    }
  }

  const handleUserChange = (userData: any) => {
    console.log("🔍 Main page: User change from feed:", userData?.name || "null")
    setUser(userData)
  }

  return (
    <div className="main-container theme-bg">
      {/* Scattered decorative dots - hidden in memorial theme */}
      <div className="decorative-dots fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-4 h-4 rounded-full bg-red-400"></div>
        <div className="absolute top-32 right-32 w-3 h-3 rounded-full bg-blue-500"></div>
        <div className="absolute top-64 left-1/4 w-5 h-5 rounded-full bg-green-500"></div>
        <div className="absolute bottom-40 right-20 w-4 h-4 rounded-full bg-yellow-500"></div>
        <div className="absolute bottom-32 left-16 w-3 h-3 rounded-full bg-pink-400"></div>
        <div className="absolute top-1/2 right-1/4 w-4 h-4 rounded-full bg-orange-400"></div>
        <div className="absolute bottom-64 left-1/3 w-3 h-3 rounded-full bg-purple-400"></div>
      </div>

      {/* Header with Navigation */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div></div> {/* Spacer */}
            <HeaderNav user={user} onAuthChange={handleAuthChange} />
          </div>

          {theme === "memorial" ? (
            // Memorial theme: Elegant header layout
            <div className="memorial-header-layout flex items-center justify-center min-h-[400px] px-8">
              <div className="flex items-center gap-12 max-w-6xl w-full">
                {/* Left side: Portrait */}
                <div className="flex-shrink-0">
                  <img
                    src="/images/brian-memorial-flyer.jpg"
                    alt="Brian Quain"
                    className="w-80 h-80 object-cover object-center rounded-lg shadow-2xl"
                  />
                  <div className="text-center mt-4 text-sm text-gray-400 font-light">YOU'LL NEVER WALK ALONE</div>
                </div>

                {/* Right side: Typography */}
                <div className="flex-1 text-center">
                  <h1 className="memorial-title text-8xl font-bold text-yellow-400 mb-6 leading-none">
                    BRIAN
                    <br />
                    QUAIN
                  </h1>
                  <div className="text-yellow-400 text-lg mb-8 font-light tracking-wider">
                    Jan 19th 1975 — June 13th 2025
                  </div>
                  <h2 className="text-2xl text-white mb-6 font-light">A Celebration of Life in Photos</h2>
                  <div className="text-gray-300 text-lg leading-relaxed max-w-md mx-auto">
                    <p className="mb-4">Share your memories, stories, and photos of Brian</p>
                    <p>Keep his spirit alive through the moments we shared</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Other themes: Original layout
            <div className="text-center">
              <div className="mb-6">
                <img
                  src="/images/brian-portrait.png"
                  alt="Brian Quain - Cartoon Portrait"
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto shadow-lg border-4 border-white"
                />
              </div>
              <h1 className="text-4xl md:text-6xl font-light text-gray-800 mb-4 tracking-wide">brian quain</h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 font-light">you'll never walk alone</p>
              <div className="w-24 h-px bg-gray-300 mx-auto"></div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 space-y-20">
        {!authChecked ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
            <p className="mt-2 text-gray-500 font-light text-sm">checking authentication...</p>
          </div>
        ) : !user ? (
          <div className="max-w-2xl mx-auto mb-12 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <Lock className="mx-auto h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-xl font-light text-blue-800 mb-2">Authentication Required</h3>
            <p className="text-blue-700 mb-4 font-light">
              The Brian Memorial Gallery requires an account to view and interact with memories. This ensures proper
              attribution and maintains the integrity of this memorial space.
            </p>
            <p className="text-blue-600 text-sm font-light">Create an account or sign in to continue</p>
          </div>
        ) : null}

        {/* Upload Section */}
        {theme !== "memorial" && (
          <section className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-light text-gray-700 mb-12 text-center">share a memory</h2>
            <UploadSection user={user} onAuthChange={handleAuthChange} />
          </section>
        )}

        {/* Memorial theme: Upload section with different styling */}
        {theme === "memorial" && (
          <section className="max-w-2xl mx-auto">
            <UploadSection user={user} onAuthChange={handleAuthChange} />
          </section>
        )}

        {/* View Toggle and Photos */}
        <section className="max-w-6xl mx-auto">
          {authChecked && <ViewToggle user={user} onUserChange={handleUserChange} />}
        </section>

        {/* Download Section */}
        <DownloadSection />
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-24 pb-12">
        <div className="container mx-auto px-6 text-center">
          <div className="w-full h-px bg-gray-200 mb-8"></div>
          <p className="text-gray-500 font-light">in memory of brian quain — forever in our hearts</p>
        </div>
      </footer>
    </div>
  )
}
