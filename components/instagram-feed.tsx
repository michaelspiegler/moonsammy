"use client"

import { useState, useEffect } from "react"
import { PhotoModal } from "./photo-modal"
import { Heart, MessageCircle, Calendar, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface InstagramFeedProps {
  user: any
  filters: {
    year: string
    tags: string[]
  }
}

export function InstagramFeed({ user, filters }: InstagramFeedProps) {
  const [photos, setPhotos] = useState<any[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPhotos()
  }, [filters])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filters.year && filters.year !== "all") {
        params.append("year", filters.year)
      }

      if (filters.tags.length > 0) {
        params.append("tags", filters.tags.join(","))
      }

      const response = await fetch(`/api/photos?${params.toString()}`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setPhotos(data.photos || [])
      } else {
        console.error("Failed to fetch photos")
        setPhotos([])
      }
    } catch (error) {
      console.error("Error fetching photos:", error)
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  const openModal = (photo: any) => {
    setSelectedPhoto(photo)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPhoto(null)
  }

  const handlePhotoUpdate = () => {
    fetchPhotos() // Refresh the photos after deletion
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
        <p className="mt-2 text-gray-500 font-light text-sm">loading photos...</p>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 font-light">no photos found</p>
        <p className="text-sm text-gray-400 mt-1">try adjusting your filters or upload some memories</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square cursor-pointer group overflow-hidden bg-gray-100"
            onClick={() => openModal(photo)}
          >
            <img
              src={photo.image_url || "/placeholder.svg"}
              alt={photo.description || "Photo"}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{photo.likes_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{photo.comments_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Tags indicator */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs bg-black bg-opacity-50 text-white border-none">
                  <Tag className="w-3 h-3 mr-1" />
                  {photo.tags.length}
                </Badge>
              </div>
            )}

            {/* Year indicator */}
            {photo.year && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs bg-black bg-opacity-50 text-white border-none">
                  <Calendar className="w-3 h-3 mr-1" />
                  {photo.year}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <PhotoModal
        photo={selectedPhoto}
        isOpen={isModalOpen}
        onClose={closeModal}
        user={user}
        onPhotoUpdate={handlePhotoUpdate}
      />
    </>
  )
}
