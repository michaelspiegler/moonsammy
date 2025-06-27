"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Heart, MessageCircle, User, Tag, Calendar, Edit2, Save } from "lucide-react"
import { TagInput } from "./tag-input"

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

interface PhotoTag {
  id: string
  name: string
}

interface Photo {
  id: string
  url: string
  filename: string
  uploadedAt: string
  uploaderName?: string
  uploaderProfileImage?: string | null
  title?: string
  year?: number
  tags?: PhotoTag[]
  comments?: Comment[]
  likes?: Like[]
}

interface PhotoModalProps {
  photo: Photo
  onUpdate: (photo: Photo) => void
  onClose: () => void
  user?: any
}

export function PhotoModal({ photo, onUpdate, onClose, user }: PhotoModalProps) {
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingYear, setEditingYear] = useState(false)
  const [tempTitle, setTempTitle] = useState(photo.title || "")
  const [tempYear, setTempYear] = useState(photo.year?.toString() || "")
  const [showTagInput, setShowTagInput] = useState(false)

  useEffect(() => {
    setTempTitle(photo.title || "")
    setTempYear(photo.year?.toString() || "")
  }, [photo])

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return

    setLoading(true)
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addComment",
          author: user.name,
          content: newComment.trim(),
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        const updatedPhoto = {
          ...photo,
          comments: [...(photo.comments || []), data.comment],
        }
        onUpdate(updatedPhoto)
        setNewComment("")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!user) return

    const userLike = photo.likes?.find((like) => like.author === user.name)

    setLoading(true)
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: userLike ? "removeLike" : "addLike",
          author: user.name,
          likeId: userLike?.id,
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        let updatedLikes = photo.likes || []
        if (userLike) {
          updatedLikes = updatedLikes.filter((like) => like.id !== userLike.id)
        } else {
          updatedLikes = [...updatedLikes, data.like]
        }

        const updatedPhoto = {
          ...photo,
          likes: updatedLikes,
        }
        onUpdate(updatedPhoto)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTitle = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateTitle",
          title: tempTitle.trim(),
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        const updatedPhoto = {
          ...photo,
          title: tempTitle.trim(),
        }
        onUpdate(updatedPhoto)
        setEditingTitle(false)
      }
    } catch (error) {
      console.error("Error updating title:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveYear = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateYear",
          year: tempYear ? Number.parseInt(tempYear) : null,
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        const updatedPhoto = {
          ...photo,
          year: tempYear ? Number.parseInt(tempYear) : undefined,
        }
        onUpdate(updatedPhoto)
        setEditingYear(false)
      }
    } catch (error) {
      console.error("Error updating year:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = async (tagName: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addTag",
          tagName: tagName.trim(),
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        const updatedPhoto = {
          ...photo,
          tags: [...(photo.tags || []), data.tag],
        }
        onUpdate(updatedPhoto)
        setShowTagInput(false)
      }
    } catch (error) {
      console.error("Error adding tag:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeTag",
          tagId: tagId,
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        const updatedPhoto = {
          ...photo,
          tags: photo.tags?.filter((tag) => tag.id !== tagId) || [],
        }
        onUpdate(updatedPhoto)
      }
    } catch (error) {
      console.error("Error removing tag:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isLikedByUser = photo.likes?.some((like) => like.author === user?.name) || false

  return (
    <div className="flex flex-col md:flex-row h-full max-h-[95vh]">
      {/* Close Button */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full p-2"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Image Section */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <Image
          src={photo.url || "/placeholder.svg"}
          alt={photo.title || photo.filename}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 70vw"
        />
      </div>

      {/* Details Section */}
      <div className="w-full md:w-96 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
              {photo.uploaderProfileImage ? (
                <Image
                  src={photo.uploaderProfileImage || "/placeholder.svg"}
                  alt={photo.uploaderName || "User"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">{photo.uploaderName || "Anonymous"}</p>
              <p className="text-sm text-gray-500">{formatDate(photo.uploadedAt)}</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-3">
            {editingTitle ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="Add a title..."
                  className="flex-1"
                />
                <Button onClick={handleSaveTitle} size="sm" disabled={loading}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button onClick={() => setEditingTitle(false)} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-800 font-medium">
                  {photo.title || <span className="text-gray-400 italic">No title</span>}
                </p>
                {user && (
                  <Button onClick={() => setEditingTitle(true)} variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Year */}
          <div className="mb-3">
            {editingYear ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={tempYear}
                  onChange={(e) => setTempYear(e.target.value)}
                  placeholder="Year (e.g., 2023)"
                  type="number"
                  className="flex-1"
                />
                <Button onClick={handleSaveYear} size="sm" disabled={loading}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button onClick={() => setEditingYear(false)} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    {photo.year || <span className="text-gray-400 italic">No year set</span>}
                  </span>
                </div>
                {user && (
                  <Button onClick={() => setEditingYear(true)} variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Tags Display */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Tags</span>
              </div>
              {user && (
                <Button onClick={() => setShowTagInput(true)} variant="ghost" size="sm">
                  <Tag className="h-4 w-4" />
                </Button>
              )}
            </div>

            {photo.tags && photo.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {photo.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    <span>{tag.name}</span>
                    {user && (
                      <button onClick={() => handleRemoveTag(tag.id)} className="ml-1 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">No tags</p>
            )}

            {/* Tag Input */}
            {showTagInput && user && (
              <div className="mt-2">
                <TagInput
                  onAddTag={handleAddTag}
                  onCancel={() => setShowTagInput(false)}
                  loading={loading}
                  placeholder="Add a tag..."
                />
              </div>
            )}
          </div>

          {/* Actions */}
          {user && (
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleLike}
                variant="ghost"
                size="sm"
                className="p-0 h-auto hover:bg-transparent"
                disabled={loading}
              >
                <Heart
                  className={`h-6 w-6 ${
                    isLikedByUser ? "fill-red-500 text-red-500" : "text-gray-700 hover:text-red-500"
                  }`}
                />
              </Button>
              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                <MessageCircle className="h-6 w-6 text-gray-700" />
              </Button>
            </div>
          )}

          {/* Likes */}
          {photo.likes && photo.likes.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-800">
                {photo.likes.length} {photo.likes.length === 1 ? "person loves" : "people love"} this
              </p>
              <p className="text-xs text-gray-600">
                {photo.likes
                  .slice(0, 3)
                  .map((like) => like.author)
                  .join(", ")}
                {photo.likes.length > 3 && ` and ${photo.likes.length - 3} others`}
              </p>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-medium text-gray-800 mb-3">Comments ({photo.comments?.length || 0})</h3>

          <div className="space-y-3 mb-4">
            {photo.comments && photo.comments.length > 0 ? (
              photo.comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm text-gray-800">{comment.author}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">No comments yet</p>
            )}
          </div>

          {/* Add Comment */}
          {user && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex space-x-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {user.profileImage ? (
                    <Image
                      src={user.profileImage || "/placeholder.svg"}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
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
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <Button onClick={handleAddComment} disabled={!newComment.trim() || loading} size="sm">
                      {loading ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
