"use client"

import { useState, useEffect } from "react"
import { PhotoGallery } from "@/components/photo-gallery"
import { UploadSection } from "@/components/upload-section"
import { ViewToggle } from "@/components/view-toggle"
import { SlideshowView } from "@/components/slideshow-view"
import { InstagramFeed } from "@/components/instagram-feed"
import { ThemeSelector } from "@/components/theme-selector"
import { HeaderNav } from "@/components/header-nav"
import { AuthModal } from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import Image from "next/image"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
}

interface Like {
  id: string
  author: string
  timestamp: string
}

interface PhotoTag {
  id: string
  name: string
}

interface Photo {
  id: string
  url: string
  filename: string
  uploadedAt: string
  uploaderName?: string
  uploaderProfileImage?: string | null
  title?: string
  year?: number
  tags?: PhotoTag[]
  comments?: Comment[]
  likes?: Like[]
}

interface UserType {
  id: string
  name: string
  email: string
  profileImage?: string
  role?: string
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"grid" | "slideshow" | "feed">("feed")
  const [user, setUser] = useState<UserType | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
    fetchPhotos()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setAuthLoading(true)
      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers,
      })
      const data = await response.json()
      if (data.user) {
        setUser(data.user)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/photos")
      const data = await response.json()
      if (data.photos) {
        setPhotos(data.photos)
      }
    } catch (error) {
      console.error("Error fetching photos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpdate = (updatedPhoto: Photo) => {
    setPhotos((prevPhotos) => prevPhotos.map((photo) => (photo.id === updatedPhoto.id ? updatedPhoto : photo)))
  }

  const handleAuthSuccess = (userData: UserType) => {
    setUser(userData)
    setShowAuthModal(false)
    // Refresh photos to get user-specific data
    fetchPhotos()
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      localStorage.removeItem("sessionToken")
      // Refresh photos to remove user-specific data
      fetchPhotos()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-amber-800 font-light">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <HeaderNav user={user} onLogout={handleLogout} />

      <main className="container mx-auto px-4 pt-20 pb-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <Image
              src="/images/brian-portrait.png"
              alt="Brian Quain"
              width={120}
              height={120}
              className="rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-light text-amber-900 mb-4 font-serif">Remembering Brian Quain</h1>
          <p className="text-xl text-amber-800 font-light max-w-2xl mx-auto font-serif">
            A celebration of life, memories, and the lasting impact of a wonderful person
          </p>
        </div>

        {/* Authentication Section */}
        {!user && (
          <div className="max-w-md mx-auto mb-12 p-6 bg-white/80 backdrop-blur-sm rounded-lg border border-amber-200 shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-light text-amber-900 mb-4 font-serif">Sign in to continue</h2>
              <p className="text-amber-700 mb-6 font-light">
                Please create an account or sign in to view and share memories
              </p>
              <Button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-amber-800 hover:bg-amber-900 text-white font-light py-3 rounded-lg transition-colors"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Create Account / Sign In
              </Button>
            </div>
          </div>
        )}

        {/* Main Content - Only show if user is authenticated */}
        {user && (
          <>
            {/* Theme Selector */}
            <div className="mb-8">
              <ThemeSelector />
            </div>

            {/* Upload Section */}
            <div className="mb-12">
              <UploadSection onUploadComplete={fetchPhotos} />
            </div>

            {/* View Toggle */}
            <div className="mb-8">
              <ViewToggle view={view} onViewChange={setView} />
            </div>

            {/* Content based on view */}
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-amber-800 font-light">Loading memories...</p>
              </div>
            ) : (
              <>
                {view === "grid" && <PhotoGallery photos={photos} />}
                {view === "slideshow" && <SlideshowView photos={photos} />}
                {view === "feed" && (
                  <InstagramFeed photos={photos} onPhotoUpdate={handlePhotoUpdate} user={user} onUserChange={setUser} />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
