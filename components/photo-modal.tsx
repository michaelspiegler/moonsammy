"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Heart, MessageCircle, Calendar, Tag, User, X, Edit3, Save, Trash2, Plus } from "lucide-react"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
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
  const [metadata, setMetadata] = useState<{
    title: string
    year: number | null
    tags: PhotoTag[]
    comments: Comment[]
    likes: number
    hasLiked: boolean
  }>({
    title: "",
    year: null,
    tags: [],
    comments: [],
    likes: 0,
    hasLiked: false,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editYear, setEditYear] = useState("")
  const [newComment, setNewComment] = useState("")
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    if (photo && isOpen) {
      fetchMetadata()
    }
  }, [photo, isOpen])

  const fetchMetadata = async () => {
    if (!photo) return

    try {
      setLoading(true)
      const response = await fetch(`/api/photos/${photo.id}/metadata`)

      if (response.ok) {
        const data = await response.json()
        setMetadata(data)
        setEditTitle(data.title || "")
        setEditYear(data.year?.toString() || "")
      } else {
        console.error("Failed to fetch metadata")
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!photo) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setTitle",
          title: editTitle,
        }),
      })

      if (response.ok) {
        setMetadata((prev) => ({ ...prev, title: editTitle }))
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error saving title:", error)
    }
  }

  const handleSaveYear = async () => {
    if (!photo) return

    try {
      const year = editYear ? Number.parseInt(editYear) : null
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setYear",
          year: year,
        }),
      })

      if (response.ok) {
        setMetadata((prev) => ({ ...prev, year }))
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error saving year:", error)
    }
  }

  const handleAddTag = async () => {
    if (!photo || !newTag.trim()) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addTag",
          tagName: newTag.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.tag) {
          setMetadata((prev) => ({
            ...prev,
            tags: [...prev.tags, data.tag],
          }))
        }
        setNewTag("")
      }
    } catch (error) {
      console.error("Error adding tag:", error)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!photo) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeTag",
          tagId: tagId,
        }),
      })

      if (response.ok) {
        setMetadata((prev) => ({
          ...prev,
          tags: prev.tags.filter((tag) => tag.id !== tagId),
        }))
      }
    } catch (error) {
      console.error("Error removing tag:", error)
    }
  }

  const handleAddComment = async () => {
    if (!photo || !newComment.trim() || !currentUser) return

    try {
      setSubmittingComment(true)
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
        const data = await response.json()
        if (data.comment) {
          setMetadata((prev) => ({
            ...prev,
            comments: [...prev.comments, data.comment],
          }))
        }
        setNewComment("")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleLike = async () => {
    if (!photo || !currentUser) return

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
        setMetadata((prev) => ({
          ...prev,
          likes: prev.likes + 1,
          hasLiked: true,
        }))
      }
    } catch (error) {
      console.error("Error liking photo:", error)
    }
  }

  const handleDeletePhoto = async () => {
    if (!photo || !currentUser || currentUser.role !== "Admin") return

    if (!confirm("Are you sure you want to delete this photo? This action cannot be undone.")) {
      return
    }

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
        alert(`Failed to delete photo: ${error.error}`)
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert("Failed to delete photo")
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-full">
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
          <div className="w-96 bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeletePhoto}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Title</Label>
                  {currentUser && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Add a title..."
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleSaveTitle}>
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">{metadata.title || "No title"}</p>
                )}
              </div>

              {/* Year */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Year</Label>
                </div>
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      placeholder="e.g. 2023"
                      type="number"
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleSaveYear}>
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-700">{metadata.year || "No year set"}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Tags</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {metadata.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs flex items-center space-x-1">
                      <Tag className="h-2 w-2" />
                      <span>{tag.name}</span>
                      {currentUser && (
                        <button onClick={() => handleRemoveTag(tag.id)} className="ml-1 hover:text-red-500">
                          <X className="h-2 w-2" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {currentUser && (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      className="text-sm"
                      onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button size="sm" onClick={handleAddTag}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between py-2 border-t border-b">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={!currentUser || metadata.hasLiked}
                    className="flex items-center space-x-1"
                  >
                    <Heart className={`h-4 w-4 ${metadata.hasLiked ? "fill-current text-red-500" : ""}`} />
                    <span className="text-sm">{metadata.likes}</span>
                  </Button>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">{metadata.comments.length}</span>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                {metadata.comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <div className="flex items-start space-x-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p>
                          <span className="font-medium">{comment.author}</span>{" "}
                          <span className="text-gray-700">{comment.content}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(comment.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Comment */}
            {currentUser && (
              <div className="p-4 border-t">
                <div className="flex items-start space-x-2">
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
                  <div className="flex-1">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[60px] text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim() || submittingComment}>
                        {submittingComment ? "Posting..." : "Post"}
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
