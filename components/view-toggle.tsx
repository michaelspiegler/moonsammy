"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PhotoGallery } from "./photo-gallery"
import { InstagramFeed } from "./instagram-feed"
import { Grid, List, RefreshCw } from "lucide-react"

interface Photo {
  id: string
  url: string
  filename: string
  uploadedAt: string
  uploaderName?: string
  title?: string
  comments?: Comment[]
  likes?: Like[]
}

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

interface ViewToggleProps {
  user?: any
  onUserChange?: (user: any) => void
}

export function ViewToggle({ user, onUserChange }: ViewToggleProps) {
  const [view, setView] = useState<"gallery" | "feed">("feed")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/photos?limit=100") // Increased limit for grid view
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
    setPhotos(photos.map((photo) => (photo.id === updatedPhoto.id ? updatedPhoto : photo)))
  }

  const handleUserChangeFromFeed = (userData: any) => {
    console.log("ViewToggle: User change from feed:", userData)
    onUserChange?.(userData)
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
        <p className="mt-4 text-gray-500 font-light">loading memories...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* View Toggle Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-light text-gray-700">
            {view === "feed" ? "memory feed" : "photo gallery"}
          </h2>
          <p className="text-gray-500 font-light text-sm mt-1">
            {photos.length} {photos.length === 1 ? "memory" : "memories"} shared
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setView("feed")}
            variant={view === "feed" ? "default" : "outline"}
            size="sm"
            className="font-light"
          >
            <List className="h-4 w-4 mr-1" />
            Feed
          </Button>
          <Button
            onClick={() => setView("gallery")}
            variant={view === "gallery" ? "default" : "outline"}
            size="sm"
            className="font-light"
          >
            <Grid className="h-4 w-4 mr-1" />
            Gallery
          </Button>
          <Button onClick={fetchPhotos} variant="ghost" size="sm" className="font-light">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        {view === "feed" ? (
          <InstagramFeed
            photos={photos}
            onPhotoUpdate={handlePhotoUpdate}
            user={user}
            onUserChange={handleUserChangeFromFeed}
          />
        ) : (
          <PhotoGallery />
        )}
      </div>
    </div>
  )
}
