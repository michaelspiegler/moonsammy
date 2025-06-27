"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, UserIcon, Calendar, Tag } from "lucide-react"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  photoId: string
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
  title?: string
  year?: number
  tags?: string[]
  comments?: Comment[]
  likes?: number
  uploader?: {
    name: string
    profileImage?: string
  }
}

interface InstagramFeedUser {
  id: string
  name: string
  email: string
  profileImage?: string
  role?: string
}

interface InstagramFeedProps {
  photos: Photo[]
  user: InstagramFeedUser | null
  onAddComment: (photoId: string, content: string) => void
  onLikePhoto: (photoId: string) => void
}

export function InstagramFeed({ photos, user, onAddComment, onLikePhoto }: InstagramFeedProps) {
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})
  const [submittingComments, setSubmittingComments] = useState<{ [key: string]: boolean }>({})

  const handleCommentSubmit = async (photoId: string) => {
    const content = commentInputs[photoId]?.trim()
    if (!content || !user) return

    setSubmittingComments((prev) => ({ ...prev, [photoId]: true }))

    try {
      await onAddComment(photoId, content)
      setCommentInputs((prev) => ({ ...prev, [photoId]: "" }))
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [photoId]: false }))
    }
  }

  const handleCommentChange = (photoId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [photoId]: value }))
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    return `${Math.floor(diffInSeconds / 604800)}w`
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please sign in to view the memory feed</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Signed-in user status */}
      <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
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
            <UserIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-800">{user.name}</p>
          <p className="text-sm text-gray-500">Viewing memories</p>
        </div>
      </div>

      {/* Photo Feed */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No memories to display yet</p>
        </div>
      ) : (
        photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            {/* Photo Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {photo.uploader?.profileImage ? (
                    <Image
                      src={photo.uploader.profileImage || "/placeholder.svg"}
                      alt={photo.uploader.name || "User"}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <UserIcon className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-800">{photo.uploader?.name || "Anonymous"}</p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(photo.uploadedAt)}</p>
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
                alt={photo.title || photo.filename}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            <CardContent className="p-4">
              {/* Action Buttons */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto hover:bg-transparent"
                    onClick={() => onLikePhoto(photo.id)}
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
                    <span className="font-medium text-gray-800">{photo.uploader?.name || "Anonymous"}</span>{" "}
                    <span className="text-gray-700">{photo.title}</span>
                  </p>
                </div>
              )}

              {/* Tags */}
              {photo.tags && photo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {photo.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Tag className="h-2 w-2 mr-1" />
                      {typeof tag === "string" ? tag : tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Comments */}
              {photo.comments && photo.comments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {photo.comments.slice(0, 3).map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <span className="font-medium text-gray-800">{comment.author}</span>{" "}
                      <span className="text-gray-700">{comment.content}</span>
                    </div>
                  ))}
                  {photo.comments.length > 3 && (
                    <p className="text-sm text-gray-500">View all {photo.comments.length} comments</p>
                  )}
                </div>
              )}

              {/* Add Comment */}
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {user.profileImage ? (
                    <Image
                      src={user.profileImage || "/placeholder.svg"}
                      alt={user.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <UserIcon className="h-3 w-3 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 flex items-center space-x-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentInputs[photo.id] || ""}
                    onChange={(e) => handleCommentChange(photo.id, e.target.value)}
                    className="min-h-[32px] resize-none text-sm border-none shadow-none p-0 focus-visible:ring-0"
                    rows={1}
                  />
                  {commentInputs[photo.id]?.trim() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-700 p-0 h-auto font-medium"
                      onClick={() => handleCommentSubmit(photo.id)}
                      disabled={submittingComments[photo.id]}
                    >
                      {submittingComments[photo.id] ? "..." : "Post"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
