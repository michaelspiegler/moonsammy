"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  X,
  Heart,
  MessageCircle,
  Calendar,
  User,
  Tag,
  Send,
  Trash2,
  Edit,
  Save,
  MoreVertical,
  Download,
} from "lucide-react"

interface Comment {
  id: string
  author: string
  content: string
  created_at: string
}

interface PhotoModalProps {
  photo: {
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
  isOpen: boolean
  onClose: () => void
  currentUser?: {
    name: string
    email: string
    role?: string
  } | null
  onPhotoUpdate?: (photoId: string) => void
}

export function PhotoModal({ photo, isOpen, onClose, currentUser, onPhotoUpdate }: PhotoModalProps) {
  const [likes, setLikes] = useState(photo.likes || 0)
  const [hasLiked, setHasLiked] = useState(false)
  const [comments, setComments] = useState<Comment[]>(photo.comments || [])
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(photo.title || "")
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState(photo.description || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      fetchPhotoData()
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen, photo.id])

  const fetchPhotoData = async () => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`)
      if (response.ok) {
        const data = await response.json()
        setLikes(data.likes || 0)
        setComments(data.comments || [])
        setHasLiked(data.hasLiked || false)
      }
    } catch (error) {
      console.error("Error fetching photo data:", error)
    }
  }

  const handleLike = async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: currentUser.name }),
      })

      if (response.ok) {
        const data = await response.json()
        setLikes(data.likes)
        setHasLiked(data.hasLiked)
      }
    } catch (error) {
      console.error("Error liking photo:", error)
    }
  }

  const handleComment = async () => {
    if (!currentUser || !newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const response = await fetch(`/api/photos/${photo.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: currentUser.name,
          content: newComment.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments([...comments, data.comment])
        setNewComment("")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleUpdateMetadata = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle.trim() || null,
          description: editedDescription.trim() || null,
        }),
      })

      if (response.ok) {
        setIsEditingTitle(false)
        setIsEditingDescription(false)
        if (onPhotoUpdate) {
          onPhotoUpdate(photo.id)
        }
      }
    } catch (error) {
      console.error("Error updating photo metadata:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!currentUser?.role || currentUser.role !== "Admin") return

    const confirmDelete = confirm(
      `Are you sure you want to delete this photo?\n\nTitle: ${photo.title || "Untitled"}\n\nThis action cannot be undone.`,
    )

    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Photo deleted successfully")
        onClose()
        if (onPhotoUpdate) {
          onPhotoUpdate(photo.id)
        }
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete photo")
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert("Failed to delete photo")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${photo.title || "photo"}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading photo:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-sm">{photo.uploader || "Anonymous"}</p>
              {photo.uploaded_at && <p className="text-xs text-gray-500">{formatDate(photo.uploaded_at)}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentUser?.role === "Admin" && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-8 w-8 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {showDropdown && (
                  <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                    <button
                      onClick={handleDownload}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                    >
                      <Download className="mr-3 h-4 w-4" />
                      Download
                    </button>
                    <button
                      onClick={handleDeletePhoto}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center disabled:opacity-50"
                    >
                      <Trash2 className="mr-3 h-4 w-4" />
                      {isDeleting ? "Deleting..." : "Delete Photo"}
                    </button>
                  </div>
                )}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Image */}
            <div className="relative bg-black flex items-center justify-center">
              <Image
                src={photo.url || "/placeholder.svg"}
                alt={photo.title || "Photo"}
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain"
                unoptimized
              />
            </div>

            {/* Details */}
            <div className="p-6 flex flex-col">
              {/* Title */}
              <div className="mb-4">
                {isEditingTitle ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full text-xl font-semibold border-b border-gray-300 focus:border-gray-500 outline-none bg-transparent"
                      placeholder="Add a title..."
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleUpdateMetadata} disabled={isUpdating}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingTitle(false)
                          setEditedTitle(photo.title || "")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{photo.title || "Untitled"}</h2>
                    {currentUser && (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(true)} className="h-8 w-8 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Add a description..."
                      className="min-h-[80px]"
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleUpdateMetadata} disabled={isUpdating}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingDescription(false)
                          setEditedDescription(photo.description || "")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <p className="text-gray-600 flex-1">
                      {photo.description || (currentUser ? "Click to add a description..." : "No description")}
                    </p>
                    {currentUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingDescription(true)}
                        className="h-8 w-8 p-0 ml-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Year */}
              {photo.year && (
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{photo.year}</span>
                </div>
              )}

              {/* Tags */}
              {photo.tags && photo.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {photo.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {typeof tag === "string" ? tag : tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-4 mb-6 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={!currentUser}
                  className={`flex items-center space-x-2 ${hasLiked ? "text-red-500" : ""}`}
                >
                  <Heart className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
                  <span>{likes}</span>
                </Button>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MessageCircle className="h-4 w-4" />
                  <span>{comments.length}</span>
                </div>
              </div>

              {/* Comments */}
              <div className="flex-1 space-y-4">
                <h3 className="font-medium">Comments</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-3 w-3 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">{comment.author}</span>
                              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Add Comment */}
                {currentUser && (
                  <div className="space-y-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[60px]"
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                      size="sm"
                      className="w-full"
                    >
                      <Send className="h-3 w-3 mr-2" />
                      {isSubmittingComment ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
