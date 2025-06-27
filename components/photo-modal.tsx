"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Heart, MessageCircle, Calendar, Tag, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface PhotoModalProps {
  photo: any
  isOpen: boolean
  onClose: () => void
  user: any
  onPhotoUpdate?: () => void
}

export function PhotoModal({ photo, isOpen, onClose, user, onPhotoUpdate }: PhotoModalProps) {
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && photo) {
      fetchComments()
      fetchLikes()
    }
  }, [isOpen, photo])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/comments`, {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error)
    }
  }

  const fetchLikes = async () => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/likes`, {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setLikes(data.count || 0)
        setIsLiked(data.isLiked || false)
      }
    } catch (error) {
      console.error("Failed to fetch likes:", error)
    }
  }

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/likes`, {
        method: isLiked ? "DELETE" : "POST",
        credentials: "include",
      })
      if (response.ok) {
        setIsLiked(!isLiked)
        setLikes((prev) => (isLiked ? prev - 1 : prev + 1))
      }
    } catch (error) {
      console.error("Failed to toggle like:", error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/photos/${photo.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ comment: comment.trim() }),
      })

      if (response.ok) {
        setComment("")
        fetchComments()
      }
    } catch (error) {
      console.error("Failed to submit comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!user || user.role !== "Admin") return

    if (!confirm("Are you sure you want to delete this photo? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        onClose()
        if (onPhotoUpdate) {
          onPhotoUpdate()
        }
      } else {
        const error = await response.json()
        alert(`Failed to delete photo: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Failed to delete photo:", error)
      alert("Failed to delete photo")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen || !photo) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="flex-1 bg-black flex items-center justify-center">
          <img
            src={photo.image_url || "/placeholder.svg"}
            alt={photo.description || "Photo"}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Details Section */}
        <div className="w-full md:w-96 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              {photo.uploader_profile_image && (
                <img
                  src={photo.uploader_profile_image || "/placeholder.svg"}
                  alt={photo.uploader_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-medium text-sm">{photo.uploader_name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(photo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && user.role === "Admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeletePhoto}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Photo Details */}
          <div className="p-4 border-b">
            {photo.description && <p className="text-sm mb-3">{photo.description}</p>}

            {photo.tags && photo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {photo.tags.map((tag: any, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {typeof tag === "string" ? tag : tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {photo.year && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Year: {photo.year}
              </p>
            )}
          </div>

          {/* Likes and Comments */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 text-sm ${
                  isLiked ? "text-red-500" : "text-gray-500"
                } hover:text-red-500 transition-colors`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                {likes}
              </button>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MessageCircle className="w-4 h-4" />
                {comments.length}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  {comment.user_profile_image && (
                    <img
                      src={comment.user_profile_image || "/placeholder.svg"}
                      alt={comment.user_name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.user_name}</span>
                      <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Comment */}
          {user && (
            <div className="p-4 border-t">
              <form onSubmit={handleSubmitComment} className="space-y-3">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="resize-none"
                  rows={2}
                />
                <Button type="submit" disabled={!comment.trim() || isSubmitting} className="w-full">
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
