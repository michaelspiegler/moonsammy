"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Heart, MessageCircle, Calendar, User, Tag, Trash2, Edit, Save, X } from "lucide-react"

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

interface PhotoModalProps {
  photo: Photo | null
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
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [likes, setLikes] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editYear, setEditYear] = useState("")

  useEffect(() => {
    if (photo && isOpen) {
      fetchPhotoData()
      setEditTitle(photo.title || "")
      setEditYear(photo.year?.toString() || "")
    }
  }, [photo, isOpen])

  const fetchPhotoData = async () => {
    if (!photo) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
        setLikes(data.likes || 0)
        setHasLiked(data.hasLiked || false)
      }
    } catch (error) {
      console.error("Error fetching photo data:", error)
    }
  }

  const handleLike = async () => {
    if (!currentUser || !photo) return

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

  const handleAddComment = async () => {
    if (!currentUser || !photo || !newComment.trim()) return

    setIsSubmitting(true)
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
        setComments(data.comments || [])
        setNewComment("")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!photo || !currentUser?.role === "Admin") return

    if (!confirm("Are you sure you want to delete this photo? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onClose()
        if (onPhotoUpdate) {
          onPhotoUpdate()
        }
      } else {
        const error = await response.json()
        alert(`Failed to delete photo: ${error.error}`)
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert("Failed to delete photo")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!photo) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          year: editYear ? Number.parseInt(editYear) : null,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        if (onPhotoUpdate) {
          onPhotoUpdate()
        }
      }
    } catch (error) {
      console.error("Error updating photo:", error)
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

  if (!photo) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col md:flex-row h-full">
          {/* Photo Section */}
          <div className="flex-1 relative bg-black">
            <Image
              src={photo.url || "/placeholder.svg"}
              alt={photo.title || "Photo"}
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          {/* Details Section */}
          <div className="w-full md:w-96 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {photo.uploaderProfileImage ? (
                      <Image
                        src={photo.uploaderProfileImage || "/placeholder.svg"}
                        alt={photo.uploaderName || "User"}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{photo.uploaderName || "Anonymous"}</p>
                    {photo.uploaded_at && <p className="text-sm text-gray-500">{formatDate(photo.uploaded_at)}</p>}
                  </div>
                </div>

                {/* Admin Actions */}
                {currentUser?.role === "Admin" && (
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} disabled={isDeleting}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700"
                    >
                      {isDeleting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Info */}
            <div className="p-4 border-b">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="Photo title..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Year</label>
                    <input
                      type="number"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="Year..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {photo.title && <h3 className="font-semibold mb-2">{photo.title}</h3>}

                  <div className="flex items-center space-x-4 mb-3">
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

                  {photo.year && (
                    <div className="flex items-center space-x-1 mb-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{photo.year}</span>
                    </div>
                  )}

                  {photo.tags && photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {photo.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {typeof tag === "string" ? tag : tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Comment */}
            {currentUser && (
              <div className="p-4 border-t">
                <div className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                    {currentUser.profileImage ? (
                      <Image
                        src={currentUser.profileImage || "/placeholder.svg"}
                        alt={currentUser.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[60px] resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim() || isSubmitting}>
                        {isSubmitting ? "Posting..." : "Post"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
