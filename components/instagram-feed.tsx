"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MessageCircle, Calendar, User, Eye, Tag } from "lucide-react"
import { PhotoModal } from "./photo-modal"

interface Comment {
  id: string
  author: string
  content: string
  created_at: string
}

interface Photo {
  id: string
  url: string
  title?: string
  description?: string
  year?: number
  tags?: Array<{ id: string; name: string }> | string[]
  likes?: number
  comments?: Comment[]
  uploader?: string
  uploaded_at?: string
  uploaderName?: string
  uploaderProfileImage?: string
}

interface InstagramFeedProps {
  user?: {
    name: string
    email: string
    role?: string
    profileImage?: string
  } | null
  filters?: {
    year?: string
    tags?: string[]
  }
}

export function InstagramFeed({ user, filters = {} }: InstagramFeedProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPhotos()
  }, [filters])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      // Safely access filters properties
      if (filters?.year && filters.year !== "all") {
        params.append("year", filters.year)
      }

      if (filters?.tags && filters.tags.length > 0) {
        params.append("tags", filters.tags.join(","))
      }

      console.log("📸 Instagram Feed: Fetching photos with params:", params.toString())

      const response = await fetch(`/api/photos?${params.toString()}`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        console.log("📸 Instagram Feed: Received photos:", data.photos?.length || 0)
        setPhotos(data.photos || [])
      } else {
        console.error("📸 Instagram Feed: Failed to fetch photos, status:", response.status)
        setPhotos([])
      }
    } catch (error) {
      console.error("📸 Instagram Feed: Error fetching photos:", error)
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addLike",
          author: user.name,
        }),
      })

      if (response.ok) {
        // Refresh photos to get updated like count
        fetchPhotos()
      }
    } catch (error) {
      console.error("Error liking photo:", error)
    }
  }

  const openModal = (photo: Photo) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
        <p className="mt-2 text-gray-500 font-light text-sm">loading photos...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please sign in to view the memory feed</p>
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
    <div className="max-w-6xl mx-auto">
      {/* User Status Bar */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {user.profileImage ? (
              <Image
                src={user.profileImage || "/placeholder.svg"}
                alt={user.name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <User className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <span>Welcome back, {user.name}!</span>
          {user.role === "Admin" && (
            <Badge variant="destructive" className="text-xs">
              Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Photo Grid - 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <Card
            key={photo.id}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => openModal(photo)}
          >
            {/* Photo Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {photo.uploaderProfileImage ? (
                    <Image
                      src={photo.uploaderProfileImage || "/placeholder.svg"}
                      alt={photo.uploaderName || "User"}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-800">{photo.uploaderName || "Anonymous"}</p>
                  {photo.uploaded_at && <p className="text-xs text-gray-500">{formatDate(photo.uploaded_at)}</p>}
                </div>
              </div>
              {photo.year && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{photo.year}</span>
                </div>
              )}
            </div>

            {/* Photo */}
            <div className="relative aspect-square">
              <Image
                src={photo.url || "/placeholder.svg"}
                alt={photo.title || "Photo"}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-4 text-white">
                  <div className="flex items-center space-x-1">
                    <Heart className="h-5 w-5" />
                    <span className="font-medium">{photo.likes || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-medium">{photo.comments?.length || 0}</span>
                  </div>
                  <Eye className="h-5 w-5" />
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              {/* Action Buttons */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto hover:bg-transparent"
                    onClick={(e) => handleLike(photo, e)}
                  >
                    <Heart className="h-5 w-5 text-gray-700 hover:text-red-500" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                    <MessageCircle className="h-5 w-5 text-gray-700" />
                  </Button>
                </div>
                {photo.likes && photo.likes > 0 && <p className="text-sm text-gray-600">{photo.likes} likes</p>}
              </div>

              {/* Title */}
              {photo.title && (
                <div className="mb-2">
                  <p className="text-sm">
                    <span className="font-medium text-gray-800">{photo.uploaderName || "Anonymous"}</span>{" "}
                    <span className="text-gray-700">{photo.title}</span>
                  </p>
                </div>
              )}

              {/* Tags */}
              {photo.tags && photo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {photo.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Tag className="h-2 w-2 mr-1" />
                      {typeof tag === "string" ? tag : tag.name}
                    </Badge>
                  ))}
                  {photo.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{photo.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Comments Preview */}
              {photo.comments && photo.comments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {photo.comments.slice(0, 2).map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <span className="font-medium text-gray-800">{comment.author}</span>{" "}
                      <span className="text-gray-700">{comment.content}</span>
                    </div>
                  ))}
                  {photo.comments.length > 2 && (
                    <p className="text-sm text-gray-500">View all {photo.comments.length} comments</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          isOpen={isModalOpen}
          onClose={closeModal}
          currentUser={user}
          onPhotoUpdate={handlePhotoUpdate}
        />
      )}
    </div>
  )
}
