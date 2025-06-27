"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Heart, MessageCircle, Calendar, User, Edit3, Save, Trash2, Tag } from "lucide-react"

interface Comment {
  id: string
  author: string
  content: string
  created_at: string
}

interface PhotoTag {
  id: string
  name: string
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

interface PhotoModalProps {
  photo: Photo
  isOpen: boolean
  onClose: () => void
  currentUser?: {
    name: string
    email: string
    role?: string
    profileImage?: string
  } | null
  onPhotoUpdate?: () => void
}

export function PhotoModal({ photo, isOpen, onClose, currentUser, onPhotoUpdate }: PhotoModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(photo.title || "")
  const [editedYear, setEditedYear] = useState(photo.year?.toString() || "")
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState<Comment[]>(photo.comments || [])
  const [likes, setLikes] = useState(photo.likes || 0)
  const [hasLiked, setHasLiked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchPhotoMetadata()
    }
  }, [isOpen, photo.id])

  const fetchPhotoMetadata = async () => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
        setLikes(data.likes || 0)
        setHasLiked(data.hasLiked || false)
      }
    } catch (error) {
      console.error("Error fetching photo metadata:", error)
    }
  }

  const handleLike = async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addLike",
          author: currentUser.name,
        }),
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

  const handleAddComment = async () => {
    if (!currentUser || !newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addComment",
          author: currentUser.name,
          content: newComment.trim(),
        }),
      })

      if (response.ok) {
        setNewComment("")
        fetchPhotoMetadata() // Refresh comments
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!currentUser?.role === "Admin") return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          year: editedYear ? Number.parseInt(editedYear) : null,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        if (onPhotoUpdate) onPhotoUpdate()
      }
    } catch (error) {
      console.error("Error updating photo:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!currentUser?.role === "Admin" || !confirm("Are you sure you want to delete this photo?")) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onClose()
        if (onPhotoUpdate) onPhotoUpdate()
      } else {
        alert("Failed to delete photo")
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert("Error deleting photo")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Photo Section */}
        <div className="flex-1 bg-black flex items-center justify-center">
          <div className="relative w-full h-full max-h-[90vh]">
            <Image
              src={photo.url || "/placeholder.svg"}
              alt={photo.title || "Photo"}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Details Section */}
        <div className="w-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
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
                <p className="font-medium text-sm">{photo.uploaderName || "Anonymous"}</p>
                {photo.uploaded_at && <p className="text-xs text-gray-500">{formatDate(photo.uploaded_at)}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentUser?.role === "Admin" && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} disabled={isSubmitting}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Title and Year */}
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="Add a title..."
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={editedYear}
                    onChange={(e) => setEditedYear(e.target.value)}
                    placeholder="e.g., 2023"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSaveEdit} disabled={isSubmitting} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {photo.title && (
                  <div>
                    <h3 className="font-semibold text-lg">{photo.title}</h3>
                  </div>
                )}
                {photo.year && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{photo.year}</span>
                  </div>
                )}
              </>
            )}

            {/* Tags */}
            {photo.tags && photo.tags.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {photo.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {typeof tag === "string" ? tag : tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between py-2 border-y">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={!currentUser}
                  className={`flex items-center space-x-1 ${hasLiked ? "text-red-500" : ""}`}
                >
                  <Heart className={`h-5 w-5 ${hasLiked ? "fill-current" : ""}`} />
                  <span>{likes}</span>
                </Button>
                <div className="flex items-center space-x-1 text-gray-500">
                  <MessageCircle className="h-5 w-5" />
                  <span>{comments.length}</span>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{comment.author}</span>{" "}
                      <span className="text-gray-700">{comment.content}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(comment.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Comment */}
          {currentUser && (
            <div className="p-4 border-t">
              <div className="flex space-x-3">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {currentUser.profileImage ? (
                    <Image
                      src={currentUser.profileImage || "/placeholder.svg"}
                      alt={currentUser.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="h-3 w-3 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmitting}
                    size="sm"
                    className="w-full"
                  >
                    {isSubmitting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
