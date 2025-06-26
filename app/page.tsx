"use client"

import { useState, useEffect } from "react"
import { PhotoGallery } from "@/components/photo-gallery"
import { InstagramFeed } from "@/components/instagram-feed"
import { UploadSection } from "@/components/upload-section"
import { HeaderNav } from "@/components/header-nav"
import { ViewToggle } from "@/components/view-toggle"
import { SlideshowView } from "@/components/slideshow-view"
import { PhotoFilter } from "@/components/photo-filter"
import { ThemeSelector } from "@/components/theme-selector"
import { DownloadSection } from "@/components/download-section"
import Image from "next/image"

interface UserType {
  id: string
  name: string
  email: string
  role?: string
  profileImage?: string
  sessionToken?: string
}

export default function Home() {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<"gallery" | "feed" | "slideshow">("gallery")
  const [filters, setFilters] = useState({
    year: "",
    tags: [] as string[],
    searchTerm: "",
  })

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      console.log("🔍 Main: Checking auth status...")
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      const data = await response.json()
      console.log("🔍 Main: Auth check result:", data?.user?.name, "role:", data?.user?.role)
      if (data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("🔍 Main: Auth check failed:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthChange = (userData: UserType | null) => {
    console.log("🔍 Main: Auth changed to:", userData?.name || "null", "role:", userData?.role)
    setUser(userData)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#D4AF37] font-serif">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-container">
      {/* Header with Navigation - Fixed positioning with high z-index */}
      <header className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-[999998]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-[#D4AF37] font-serif">Brian Quain Memorial</h1>
            </div>

            {/* Header Navigation with proper z-index */}
            <div className="relative z-[999999]">
              <HeaderNav user={user} onAuthChange={handleAuthChange} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Add top padding to account for fixed header */}
      <main className="pt-20">
        {user ? (
          <>
            {/* Memorial Header */}
            <div className="memorial-header-layout container mx-auto px-4 py-8">
              <div className="text-center space-y-6">
                <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-[#D4AF37] shadow-2xl">
                  <Image src="/images/brian-portrait.png" alt="Brian Quain" fill className="object-cover" priority />
                </div>
                <div>
                  <h1 className="memorial-title text-4xl md:text-5xl text-[#D4AF37] mb-4">Remembering Brian Quain</h1>
                  <p className="text-lg text-[#D4AF37]/80 max-w-2xl mx-auto font-serif leading-relaxed">
                    A celebration of life, memories, and the lasting impact of a remarkable person. Share your photos,
                    stories, and keep his memory alive.
                  </p>
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="container mx-auto px-4 mb-8">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
                  <ThemeSelector />
                </div>
                <PhotoFilter filters={filters} onFiltersChange={setFilters} />
              </div>
            </div>

            {/* Content based on current view */}
            <div className="container mx-auto px-4">
              {currentView === "gallery" && <PhotoGallery filters={filters} />}
              {currentView === "feed" && <InstagramFeed filters={filters} />}
              {currentView === "slideshow" && <SlideshowView filters={filters} />}
            </div>

            {/* Upload Section */}
            <div className="container mx-auto px-4 py-12">
              <UploadSection user={user} onUploadSuccess={() => window.location.reload()} />
            </div>

            {/* Download Section */}
            <div className="container mx-auto px-4 py-8">
              <DownloadSection />
            </div>
          </>
        ) : (
          /* Sign-in Required Section */
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center space-y-8">
              {/* Memorial Header for non-authenticated users */}
              <div className="space-y-6">
                <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-[#D4AF37] shadow-2xl">
                  <Image src="/images/brian-portrait.png" alt="Brian Quain" fill className="object-cover" priority />
                </div>
                <div>
                  <h1 className="memorial-title text-4xl md:text-5xl text-[#D4AF37] mb-4 font-serif">
                    Remembering Brian Quain
                  </h1>
                  <p className="text-lg text-[#D4AF37]/80 max-w-2xl mx-auto font-serif leading-relaxed">
                    A celebration of life, memories, and the lasting impact of a remarkable person.
                  </p>
                </div>
              </div>

              {/* Sign in to continue block */}
              <div className="bg-[#222222] border border-[#333333] rounded-lg p-8 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-[#D4AF37] font-serif">Sign in to continue</h2>
                  <p className="text-[#D4AF37]/80 font-serif">
                    Please create an account or sign in to view and share memories of Brian.
                  </p>
                </div>

                {/* Sign-in button with proper z-index */}
                <div className="relative z-[999999]">
                  <HeaderNav user={user} onAuthChange={handleAuthChange} showButtonOnly={true} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
