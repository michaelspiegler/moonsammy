"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MessageCircle, Calendar, User, Eye } from "lucide-react"
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
}

interface InstagramFeedProps {
  photos: Photo[]
  currentUser?: {
    name: string
    email: string
    role?: string
  } | null
  onPhotoUpdate?: () => void
}

export function InstagramFeed({ photos, currentUser, onPhotoUpdate }: InstagramFeedProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [photoStats, setPhotoStats] = useState<Record<string, { likes: number; comments: number; hasLiked: boolean }>>(
    {},
  )

  useEffect(() => {
    // Fetch stats for all photos
    photos.forEach(fetchPhotoStats)
  }, [photos])

  const fetchPhotoStats = async (photo: Photo) => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`)
      if (response.ok) {
        const data = await response.json()
        setPhotoStats((prev) => ({
          ...prev,
          [photo.id]: {
            likes: data.likes || 0,
            comments: data.comments?.length || 0,
            hasLiked: data.hasLiked || false,
          },
        }))
      }
    } catch (error) {
      console.error("Error fetching photo stats:", error)
    }
  }

  const handleLike = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: currentUser.name }),
      })

      if (response.ok) {
        const data = await response.json()
        setPhotoStats((prev) => ({
          ...prev,
          [photo.id]: {
            ...prev[photo.id],
            likes: data.likes,
            hasLiked: data.hasLiked,
          },
        }))
      }
    } catch (error) {
      console.error("Error liking photo:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handlePhotoUpdate = () => {
    if (onPhotoUpdate) {
      onPhotoUpdate()
    }
    // Refresh stats for all photos
    photos.forEach(fetchPhotoStats)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* User Status Bar */}
      <div className="text-center mb-8">
        {currentUser ? (
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-400" />
            </div>
            <span>Welcome back, {currentUser.name}!</span>
            {currentUser.role === "Admin" && (
              <Badge variant="destructive" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-gray-600">Sign in to like and comment on photos</p>
        )}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {photos.map((photo) => {
          const stats = photoStats[photo.id] || { likes: 0, comments: 0, hasLiked: false }

          return (
            <Card
              key={photo.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => setSelectedPhoto(photo)}
            >
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
                      <Heart className={`h-5 w-5 ${stats.hasLiked ? "fill-current text-red-500" : ""}`} />
                      <span className="font-medium">{stats.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-5 w-5" />
                      <span className="font-medium">{stats.comments}</span>
                    </div>
                    <Eye className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{photo.uploader || "Anonymous"}</p>
                    {photo.uploaded_at && <p className="text-xs text-gray-500">{formatDate(photo.uploaded_at)}</p>}
                  </div>
                </div>

                {/* Title */}
                {photo.title && <h3 className="font-semibold text-sm mb-2 line-clamp-2">{photo.title}</h3>}

                {/* Description */}
                {photo.description && <p className="text-gray-600 text-xs mb-3 line-clamp-2">{photo.description}</p>}

                {/* Year */}
                {photo.year && (
                  <div className="flex items-center space-x-1 mb-2">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{photo.year}</span>
                  </div>
                )}

                {/* Tags */}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {photo.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {typeof tag === "string" ? tag : tag.name}
                        </Badge>
                      ))}
                      {photo.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{photo.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleLike(photo, e)}
                      disabled={!currentUser}
                      className={`flex items-center space-x-1 h-8 px-2 ${stats.hasLiked ? "text-red-500" : ""}`}
                    >
                      <Heart className={`h-4 w-4 ${stats.hasLiked ? "fill-current" : ""}`} />
                      <span className="text-xs">{stats.likes}</span>
                    </Button>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">{stats.comments}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          currentUser={currentUser}
          onPhotoUpdate={handlePhotoUpdate}
        />
      )}
    </div>
  )
}
