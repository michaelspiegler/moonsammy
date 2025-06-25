"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, MessageCircle, Calendar, User } from "lucide-react"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
}

interface Photo {
  id: string
  url: string
  filename: string
  uploadedAt: string
  title?: string
  comments?: Comment[]
}

interface AdminPhotoCardProps {
  photo: Photo
  onDelete: () => void
  onDeleteComment: (commentId: string, photoId: string) => void
}

export function AdminPhotoCard({ photo, onDelete, onDeleteComment }: AdminPhotoCardProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-light text-gray-700 truncate">
            {photo.title || "Untitled Memory"}
          </CardTitle>
          <Button onClick={handleDelete} disabled={deleting} variant="destructive" size="sm" className="font-light">
            <Trash2 className="h-4 w-4 mr-1" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(photo.uploadedAt)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Photo Preview */}
        <div className="relative aspect-square">
          <Image
            src={photo.url || "/placeholder.svg"}
            alt={photo.title || "Memory"}
            fill
            className="object-cover border border-gray-200 rounded"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Photo Info */}
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Filename:</span> {photo.filename}
          </p>
          <p>
            <span className="font-medium">ID:</span> {photo.id}
          </p>
        </div>

        {/* Comments Section */}
        {photo.comments && photo.comments.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Comments ({photo.comments.length})</span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {photo.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-3 rounded border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-gray-800 text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">{formatCommentDate(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700 break-words">{comment.content}</p>
                    </div>
                    <Button
                      onClick={() => onDeleteComment(comment.id, photo.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {photo.comments && photo.comments.length === 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 text-gray-500">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">No comments yet</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
