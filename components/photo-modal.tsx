"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Edit2, MessageCircle, Send, AlertCircle, Database, Download, Calendar, Tag, Plus, User } from "lucide-react"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
}

interface PhotoTag {
  id: string
  name: string
  photoCount?: number
}

interface Photo {
  id: string
  url: string
  filename: string
  uploadedAt: string
  title?: string
  year?: number | null
  tags?: PhotoTag[]
  comments?: Comment[]
}

interface PhotoModalProps {
  photo: Photo
  onUpdate: (photo: Photo) => void
  onClose: () => void
}

export function PhotoModal({ photo, onUpdate, onClose }: PhotoModalProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingYear, setIsEditingYear] = useState(false)
  const [title, setTitle] = useState(photo.title || "")
  const [year, setYear] = useState(photo.year?.toString() || "")
  const [tags, setTags] = useState<PhotoTag[]>(photo.tags || [])
  const [newTag, setNewTag] = useState("")
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>(photo.comments || [])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [existingTags, setExistingTags] = useState<PhotoTag[]>([])
  const [filteredTags, setFilteredTags] = useState<PhotoTag[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  // Check for current user and load author name
  useEffect(() => {
    checkCurrentUser()

    // Load author name from localStorage only if not logged in
    const savedName = localStorage.getItem("authorName")
    if (savedName) {
      setAuthorName(savedName)
    }

    // Fetch latest metadata when modal opens
    fetchLatestMetadata()
    fetchExistingTags()
  }, [photo.id])

  // Add this function after checkCurrentUser
  const fetchExistingTags = async () => {
    try {
      const response = await fetch("/api/tags")
      const data = await response.json()
      if (data.tags) {
        setExistingTags(data.tags)
      }
    } catch (error) {
      console.error("Error fetching existing tags:", error)
    }
  }

  const checkCurrentUser = async () => {
    try {
      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers,
      })
      const data = await response.json()
      if (data.user) {
        setCurrentUser(data.user)
      } else {
        // Check for uploader name from localStorage
        const uploaderName = localStorage.getItem("uploaderName")
        if (uploaderName) {
          setAuthorName(uploaderName)
        }
      }
    } catch (error) {
      console.error("Error checking current user:", error)
      // Fallback to localStorage names
      const uploaderName = localStorage.getItem("uploaderName")
      if (uploaderName) {
        setAuthorName(uploaderName)
      }
    }
  }

  const getCurrentAuthorName = () => {
    return currentUser ? currentUser.name : authorName.trim()
  }

  const fetchLatestMetadata = async () => {
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`)
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setComments(data.comments || [])
        setTitle(data.title || "")
        setYear(data.year?.toString() || "")
        setTags(data.tags || [])
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
      setError("Failed to load latest metadata")
    }
  }

  const handleSaveTitle = async () => {
    if (title.trim() === photo.title) {
      setIsEditingTitle(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setTitle", title: title.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const updatedPhoto = { ...photo, title: title.trim() }
        onUpdate(updatedPhoto)
        setIsEditingTitle(false)
      } else {
        setError(data.error || "Failed to save title")
      }
    } catch (error) {
      console.error("Error saving title:", error)
      setError("Failed to save title. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveYear = async () => {
    const yearNum = year.trim() ? Number.parseInt(year.trim()) : null
    if (yearNum === photo.year) {
      setIsEditingYear(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setYear", year: yearNum }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const updatedPhoto = { ...photo, year: yearNum }
        onUpdate(updatedPhoto)
        setIsEditingYear(false)
      } else {
        setError(data.error || "Failed to save year")
      }
    } catch (error) {
      console.error("Error saving year:", error)
      setError("Failed to save year. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleTagInputChange = (value: string) => {
    setNewTag(value)
    if (value.trim()) {
      const filtered = existingTags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(value.toLowerCase()) &&
          !tags.some((existingTag) => existingTag.id === tag.id),
      )
      setFilteredTags(filtered)
      setShowTagSuggestions(filtered.length > 0)
    } else {
      setShowTagSuggestions(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addTag", tagName: newTag.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const newTagObj = data.tag
        const updatedTags = [...tags, newTagObj]
        setTags(updatedTags)

        const updatedPhoto = {
          ...photo,
          tags: updatedTags,
        }
        onUpdate(updatedPhoto)
        setNewTag("")
        setIsAddingTag(false)
        setShowTagSuggestions(false)
      } else {
        setError(data.error || "Failed to add tag")
      }
    } catch (error) {
      console.error("Error adding tag:", error)
      setError("Failed to add tag. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectExistingTag = async (selectedTag: PhotoTag) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addTag", tagId: selectedTag.id }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const updatedTags = [...tags, selectedTag]
        setTags(updatedTags)

        const updatedPhoto = {
          ...photo,
          tags: updatedTags,
        }
        onUpdate(updatedPhoto)
        setNewTag("")
        setIsAddingTag(false)
        setShowTagSuggestions(false)
      } else {
        setError(data.error || "Failed to add tag")
      }
    } catch (error) {
      console.error("Error adding existing tag:", error)
      setError("Failed to add tag. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeTag", tagId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const updatedTags = tags.filter((tag) => tag.id !== tagId)
        setTags(updatedTags)

        const updatedPhoto = {
          ...photo,
          tags: updatedTags,
        }
        onUpdate(updatedPhoto)
      } else {
        setError(data.error || "Failed to remove tag")
      }
    } catch (error) {
      console.error("Error removing tag:", error)
      setError("Failed to remove tag. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    const commentAuthor = getCurrentAuthorName()
    if (!commentAuthor) {
      setError("Please set your name in the upload section or sign in to leave comments.")
      return
    }

    // Save author name to localStorage if not logged in
    if (!currentUser && authorName.trim()) {
      localStorage.setItem("authorName", authorName.trim())
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addComment",
          author: commentAuthor,
          content: newComment.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const newCommentObj = data.comment
        const updatedComments = [...comments, newCommentObj]
        setComments(updatedComments)

        const updatedPhoto = {
          ...photo,
          comments: updatedComments,
        }
        onUpdate(updatedPhoto)
        setNewComment("")
        setIsAddingComment(false)
      } else {
        setError(data.error || "Failed to add comment")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      setError("Failed to add comment. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = photo.filename || "memory.jpg"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
      alert("Download failed. Please try again.")
    }
  }

  const canAddComment = getCurrentAuthorName().length > 0

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTagSuggestions) {
        const target = event.target as Element
        if (!target.closest(".relative")) {
          setShowTagSuggestions(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showTagSuggestions])

  return (
    <div className="flex flex-col md:flex-row max-h-[90vh]">
      {/* Image Section */}
      <div className="flex-1 relative bg-gray-100 flex items-center justify-center min-h-0">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white p-2 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={handleDownload}
          className="absolute top-4 left-4 z-10 bg-white/80 hover:bg-white p-2 rounded-full transition-colors"
          title="Download photo"
        >
          <Download className="h-4 w-4" />
        </button>
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <Image
            src={photo.url || "/placeholder.svg"}
            alt={photo.title || "Memory"}
            width={1200}
            height={800}
            className="max-w-full max-h-full object-contain"
            style={{ width: "auto", height: "auto" }}
          />
        </div>
      </div>

      {/* Details Section */}
      <div className="w-full md:w-96 flex flex-col bg-white">
        {/* Title Section */}
        <div className="p-6 border-b border-gray-200">
          {isEditingTitle ? (
            <div className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a title for this memory..."
                className="font-light"
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
              />
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveTitle}
                  disabled={loading}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-light px-4 py-2"
                >
                  {loading ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={() => {
                    setTitle(photo.title || "")
                    setIsEditingTitle(false)
                    setError(null)
                  }}
                  variant="outline"
                  className="font-light px-4 py-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-light text-gray-800 mb-2">{title || "Untitled Memory"}</h3>
                <p className="text-sm text-gray-500 font-light">{formatDate(photo.uploadedAt)}</p>
              </div>
              <Button
                onClick={() => setIsEditingTitle(true)}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Year Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-light text-gray-700">Year Taken</span>
            </div>
            <Button
              onClick={() => setIsEditingYear(true)}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>

          {isEditingYear ? (
            <div className="space-y-3">
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2020"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                className="font-light"
                onKeyDown={(e) => e.key === "Enter" && handleSaveYear()}
              />
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveYear}
                  disabled={loading}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-light px-4 py-2"
                >
                  {loading ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={() => {
                    setYear(photo.year?.toString() || "")
                    setIsEditingYear(false)
                    setError(null)
                  }}
                  variant="outline"
                  className="font-light px-4 py-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 font-light">{year ? year : "Year not specified"}</p>
          )}
        </div>

        {/* Tags Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="font-light text-gray-700">Tags ({tags.length})</span>
            </div>
            <Button
              onClick={() => setIsAddingTag(!isAddingTag)}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Add Tag Form */}
          {isAddingTag && (
            <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded relative">
              <div className="relative">
                <Input
                  value={newTag}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  placeholder="Add a tag (e.g. family, friends, work...)"
                  className="font-light"
                  onKeyDown={(e) => e.key === "Enter" && !showTagSuggestions && handleAddTag()}
                  onFocus={() => newTag.trim() && setShowTagSuggestions(filteredTags.length > 0)}
                />

                {/* Tag Suggestions Dropdown */}
                {showTagSuggestions && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    <div className="p-2 text-xs text-gray-500 border-b">Existing tags:</div>
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleSelectExistingTag(tag)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center justify-between"
                      >
                        <span>{tag.name}</span>
                        <span className="text-xs text-gray-400">({tag.photoCount} photos)</span>
                      </button>
                    ))}
                    {newTag.trim() && !existingTags.some((tag) => tag.name.toLowerCase() === newTag.toLowerCase()) && (
                      <div className="border-t">
                        <div className="p-2 text-xs text-gray-500">Create new:</div>
                        <button
                          onClick={handleAddTag}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-blue-600 font-medium"
                        >
                          + "{newTag}"
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleAddTag}
                  disabled={loading || !newTag.trim()}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-light px-4 py-2"
                >
                  {loading ? "Adding..." : "Add New Tag"}
                </Button>
                <Button
                  onClick={() => {
                    setIsAddingTag(false)
                    setNewTag("")
                    setShowTagSuggestions(false)
                    setError(null)
                  }}
                  variant="outline"
                  className="font-light px-4 py-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Tags Display */}
          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                >
                  <span>{tag.name}</span>
                  <button onClick={() => handleRemoveTag(tag.id)} className="text-blue-600 hover:text-blue-800 ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 font-light text-sm">No tags added yet</p>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-600 text-sm font-light">{error}</p>
                {error.includes("Database") && (
                  <p className="text-red-500 text-xs mt-1 font-light">
                    <Database className="h-3 w-3 inline mr-1" />
                    Neon database integration required
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-light text-gray-700">Memories & Stories ({comments.length})</h4>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setIsAddingTag(!isAddingTag)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  title="Add tag"
                >
                  <Tag className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setIsAddingComment(!isAddingComment)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  disabled={!canAddComment}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Add Comment Form */}
            {isAddingComment && (
              <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded">
                {currentUser ? (
                  // Logged in user - show their info
                  <div className="flex items-center space-x-2 mb-3">
                    {currentUser.profileImage ? (
                      <img
                        src={currentUser.profileImage || "/placeholder.svg"}
                        alt="Profile"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                    )}
                    <span className="font-medium text-gray-700">{currentUser.name}</span>
                    <span className="text-xs text-green-600">(Account)</span>
                  </div>
                ) : (
                  // Not logged in - show name input
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name"
                    className="font-light"
                  />
                )}
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share a memory about this photo..."
                  className="font-light resize-none"
                  rows={3}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleAddComment}
                    disabled={loading || !newComment.trim() || (!currentUser && !authorName.trim())}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-light px-4 py-2"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {loading ? "Sharing..." : "Share"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingComment(false)
                      setError(null)
                    }}
                    variant="outline"
                    className="font-light px-4 py-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Show message if can't add comment */}
            {!canAddComment && !isAddingComment && (
              <div className="text-center py-4 bg-gray-50 rounded mb-4">
                <p className="text-gray-600 text-sm font-light">
                  Set your name in the upload section or sign in to share memories
                </p>
              </div>
            )}
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">{comment.author}</span>
                    <span className="text-xs text-gray-500">{formatDate(comment.timestamp)}</span>
                  </div>
                  <p className="text-gray-600 font-light leading-relaxed">{comment.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                <p className="text-gray-500 font-light">No memories shared yet.</p>
                <p className="text-gray-400 font-light text-sm">Be the first to add one!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
