"use client"

import { useState, useEffect } from "react"
import { HeaderNav } from "@/components/header-nav"
import { AuthModal } from "@/components/auth-modal"
import { PhotoGallery } from "@/components/photo-gallery"
import { UploadSection } from "@/components/upload-section"
import { PhotoFilter } from "@/components/photo-filter"
import { DownloadSection } from "@/components/download-section"
import { Toaster } from "@/components/ui/toaster"
import type { User, Photo } from "@/lib/types"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([])

  useEffect(() => {
    const checkUserSession = async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error("Session check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }
    checkUserSession()
  }, [])

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch("/api/photos")
        if (res.ok) {
          const data = await res.json()
          setPhotos(data)
          setFilteredPhotos(data)
        }
      } catch (error) {
        console.error("Failed to fetch photos:", error)
      }
    }
    fetchPhotos()
  }, [])

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser)
    setIsAuthModalOpen(false)
  }

  const handleLogout = () => {
    setUser(null)
  }

  const handleUploadSuccess = (newPhoto: Photo) => {
    const updatedPhotos = [newPhoto, ...photos]
    setPhotos(updatedPhotos)
    setFilteredPhotos(updatedPhotos)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="main-container">
      <HeaderNav user={user} onLoginClick={() => setIsAuthModalOpen(true)} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12 memorial-header-layout p-8">
          <h1 className="text-5xl font-bold memorial-title">In Loving Memory of Brian Quain</h1>
          <p className="text-lg mt-4 text-muted-foreground">A collection of shared moments and cherished memories.</p>
        </div>

        {!user && (
          <div className="text-center bg-card p-6 rounded-lg shadow-lg mb-8 border border-border">
            <h2 className="text-2xl font-semibold text-card-foreground">Welcome</h2>
            <p className="text-muted-foreground mt-2">Please sign in to upload your photos and share your memories.</p>
            <button onClick={() => setIsAuthModalOpen(true)} className="mt-4 btn">
              Sign In or Create Account
            </button>
          </div>
        )}

        {user && <UploadSection onSuccess={handleUploadSuccess} />}

        <div className="my-8">
          <PhotoFilter photos={photos} onFilter={setFilteredPhotos} />
        </div>

        <PhotoGallery photos={filteredPhotos} />

        <DownloadSection />
      </main>

      <Toaster />

      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}
