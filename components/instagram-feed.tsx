"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, User, Tag } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { PhotoModal } from "./photo-modal"
import { AuthModal } from "./auth-modal"
import { PhotoFilter } from "./photo-filter"
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

interface InstagramFeedProps {
  photos: Photo[]
  onPhotoUpdate: (photo: Photo) => void
  user?: any
  onUserChange?: (user: any) => void
}

export function InstagramFeed({ photos, onPhotoUpdate, user, onUserChange }: InstagramFeedProps) {
  const [newComments, setNewComments] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [showCommentInput, setShowCommentInput] = useState<{ [key: string]: boolean }>({})
  const [showTagInput, setShowTagInput] = useState<{ [key: string]: boolean }>({})
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [localUser, setLocalUser] = useState<any>(user)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [activeYears, setActiveYears] = useState<number[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>(photos)

  useEffect(() => {
    setLocalUser(user)
  }, [user])

  useEffect(() => {
    if (!user) {
      checkAuthStatus()
    }
  }, [user])

  useEffect(() => {
    setFilteredPhotos(photos)
  }, [photos])

  useEffect(() => {
    let filtered = photos

    // Filter by tags
    if (activeTags.length > 0) {
      filtered = filtered.filter((photo) => photo.tags?.some((tag) => activeTags.includes(tag.name)))
    }

    // Filter by years
    if (activeYears.length > 0) {
      filtered = filtered.filter((photo) => photo.year && activeYears.includes(photo.year))
    }

    setFilteredPhotos(filtered)
  }, [activeTags, activeYears, photos])

  const checkAuthStatus = async () => {
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
        setLocalUser(data.user)
        onUserChange?.(data.user)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setLocalUser(null)
      onUserChange?.(null)
      localStorage.removeItem("sessionToken")
      window.location.reload()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const getCurrentUserName = () => {
    return localUser ? localUser.name : null
  }

  const handleCommentClick = (photoId: string) => {
    if (!localUser) {
      setShowAuthModal(true)
      return
    }

    setShowCommentInput({
      ...showCommentInput,
      [photoId]: !showCommentInput[photoId],
    })
  }

  const handleTagClick = (photoId: string) => {
    if (!localUser) {
      setShowAuthModal(true)
      return
    }

    setShowTagInput({
      ...showTagInput,
      [photoId]: !showTagInput[photoId],
    })
  }

  const handleAddTagToPhoto = async (photoId: string, tagName: string) => {
    setLoading({ ...loading, [photoId]: true })

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photoId)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addTag", tagName: tagName.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const photo = filteredPhotos.find((p) => p.id === photoId)
        if (photo) {
          const updatedPhoto = {
            ...photo,
            tags: [...(photo.tags || []), data.tag],
          }
          onPhotoUpdate(updatedPhoto)
        }

        setShowTagInput({ ...showTagInput, [photoId]: false })
      }
    } catch (error) {
      console.error("Error adding tag:", error)
    } finally {
      setLoading({ ...loading, [photoId]: false })
    }
  }

  const handleAddComment = async (photoId: string) => {
    const comment = newComments[photoId]?.trim()
    const commentAuthor = getCurrentUserName()
    if (!comment || !commentAuthor) return

    setLoading({ ...loading, [photoId]: true })

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photoId)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addComment",
          author: commentAuthor,
          content: comment,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const photo = filteredPhotos.find((p) => p.id === photoId)
        if (photo) {
          const updatedPhoto = {
            ...photo,
            comments: [...(photo.comments || []), data.comment],
          }
          onPhotoUpdate(updatedPhoto)
        }

        setNewComments({ ...newComments, [photoId]: "" })
        setShowCommentInput({ ...showCommentInput, [photoId]: false })
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setLoading({ ...loading, [photoId]: false })
    }
  }

  const handleLikeClick = (photoId: string) => {
    if (!localUser) {
      setShowAuthModal(true)
      return
    }

    const photo = filteredPhotos.find((p) => p.id === photoId)
    if (!photo) return

    const currentAuthor = localUser.name
    const userLike = photo.likes?.find((like) => like.author === currentAuthor)

    if (userLike) {
      handleUnlike(photoId, userLike.id)
    } else {
      handleLike(photoId, currentAuthor)
    }
  }

  const handleLike = async (photoId: string, name: string) => {
    if (!name.trim()) return

    setLoading({ ...loading, [photoId]: true })

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photoId)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addLike",
          author: name.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const photo = filteredPhotos.find((p) => p.id === photoId)
        if (photo) {
          const updatedPhoto = {
            ...photo,
            likes: [...(photo.likes || []), data.like],
          }
          onPhotoUpdate(updatedPhoto)
        }
      }
    } catch (error) {
      console.error("Error adding like:", error)
    } finally {
      setLoading({ ...loading, [photoId]: false })
    }
  }

  const handleUnlike = async (photoId: string, likeId: string) => {
    setLoading({ ...loading, [photoId]: true })

    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photoId)}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeLike",
          likeId: likeId,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const photo = filteredPhotos.find((p) => p.id === photoId)
        if (photo) {
          const updatedPhoto = {
            ...photo,
            likes: photo.likes?.filter((like) => like.id !== likeId) || [],
          }
          onPhotoUpdate(updatedPhoto)
        }
      }
    } catch (error) {
      console.error("Error removing like:", error)
    } finally {
      setLoading({ ...loading, [photoId]: false })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "now"
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "now"
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }

  const isLikedByUser = (photo: Photo) => {
    const currentAuthor = getCurrentUserName()
    return photo.likes?.some((like) => like.author === currentAuthor) || false
  }

  const handleAuthModalSuccess = async (userData: any) => {
    console.log("Auth success in feed:", userData)
    setLocalUser(userData)
    onUserChange?.(userData)
    setShowAuthModal(false)

    setTimeout(async () => {
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
          setLocalUser(data.user)
          onUserChange?.(data.user)
        }
      } catch (error) {
        console.error("Auth recheck failed:", error)
      }
    }, 500)
  }

  const handleFilter = (tags: string[], years: number[]) => {
    setActiveTags(tags)
    setActiveYears(years)
  }

  const handleTagFilterClick = (tagName: string) => {
    if (activeTags.includes(tagName)) {
      const newTags = activeTags.filter((tag) => tag !== tagName)
      setActiveTags(newTags)
    } else {
      const newTags = [...activeTags, tagName]
      setActiveTags(newTags)
    }
  }

  const currentUserName = getCurrentUserName()

  return (
    <div className="w-full">
      {localUser && (
        <div className="max-w-md mx-auto mb-8 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {localUser.profileImage ? (
                <Image
                  src={localUser.profileImage || "/placeholder.svg"}
                  alt="Profile"
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-green-600" />
              )}
              <span className="text-green-700 font-medium text-sm">Signed in as {localUser.name}</span>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-700 text-xs"
            >
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* Photo Filter */}
      <PhotoFilter onFilter={handleFilter} activeTags={activeTags} activeYears={activeYears} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPhotos.map((photo) => (
          <div key={photo.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden">
                  {photo.uploaderProfileImage ? (
                    <Image
                      src={photo.uploaderProfileImage || "/placeholder.svg"}
                      alt={photo.uploaderName || "User"}
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{photo.uploaderName || "Anonymous"}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(photo.uploadedAt)}
                    {photo.year && <span className="ml-1">• {photo.year}</span>}
                  </p>
                </div>
              </div>
              {photo.title && (
                <div className="mt-2">
                  <p className="text-gray-800 text-sm font-medium">{photo.title}</p>
                </div>
              )}
            </div>

            <div className="relative aspect-square cursor-pointer group" onClick={() => setSelectedPhoto(photo)}>
              <Image
                src={photo.url || "/placeholder.svg"}
                alt={photo.title || "Memory"}
                fill
                className="object-cover group-hover:opacity-95 transition-opacity"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-center space-x-3 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0"
                  onClick={() => handleLikeClick(photo.id)}
                  disabled={loading[photo.id]}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isLikedByUser(photo) ? "fill-red-500 text-red-500" : "text-gray-700 hover:text-red-500"
                    }`}
                  />
                </Button>
                <Button variant="ghost" size="sm" className="p-0" onClick={() => handleCommentClick(photo.id)}>
                  <MessageCircle
                    className={`h-5 w-5 ${
                      showCommentInput[photo.id] ? "text-blue-500" : "text-gray-700 hover:text-blue-500"
                    }`}
                  />
                </Button>
                <Button variant="ghost" size="sm" className="p-0" onClick={() => handleTagClick(photo.id)}>
                  <Tag
                    className={`h-5 w-5 ${
                      showTagInput[photo.id] ? "text-green-500" : "text-gray-700 hover:text-green-500"
                    }`}
                  />
                </Button>
              </div>

              {photo.likes && photo.likes.length > 0 && (
                <div className="mb-2">
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

              {/* Tags Section */}
              {photo.tags && photo.tags.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {photo.tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagFilterClick(tag.name)}
                        className={`inline-flex items-center px-2 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                          activeTags.includes(tag.name)
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }`}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag Input */}
              {showTagInput[photo.id] && localUser && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Add a tag</span>
                  </div>
                  <TagInput
                    onAddTag={(tagName) => handleAddTagToPhoto(photo.id, tagName)}
                    onCancel={() => setShowTagInput({ ...showTagInput, [photo.id]: false })}
                    loading={loading[photo.id]}
                    placeholder="Search or create a tag..."
                  />
                </div>
              )}

              {/* Comment Input */}
              {showCommentInput[photo.id] && localUser && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      {localUser.profileImage ? (
                        <Image
                          src={localUser.profileImage || "/placeholder.svg"}
                          alt="Profile"
                          width={20}
                          height={20}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-2.5 w-2.5 text-gray-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{localUser.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Share a memory about this photo..."
                      value={newComments[photo.id] || ""}
                      onChange={(e) => setNewComments({ ...newComments, [photo.id]: e.target.value })}
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleAddComment(photo.id)
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleAddComment(photo.id)}
                      disabled={!newComments[photo.id]?.trim() || loading[photo.id]}
                      size="sm"
                      className="px-4"
                    >
                      {loading[photo.id] ? "..." : "Post"}
                    </Button>
                  </div>
                  <Button
                    onClick={() => setShowCommentInput({ ...showCommentInput, [photo.id]: false })}
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-gray-500 p-0"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <div className="space-y-1 mb-3">
                {photo.comments && photo.comments.length > 0 && (
                  <>
                    {photo.comments.length > 2 && (
                      <button
                        className="text-gray-500 text-xs font-light hover:text-gray-700 transition-colors cursor-pointer"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        View all {photo.comments.length} comments
                      </button>
                    )}
                    {photo.comments.slice(-2).map((comment) => (
                      <div key={comment.id} className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-800 text-xs">{comment.author}</span>
                          <span className="ml-1 text-gray-800 text-xs break-words">{comment.content}</span>
                        </div>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatCommentDate(comment.timestamp)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPhotos.length === 0 && photos.length > 0 && (
        <div className="text-center py-20">
          <Tag className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-2xl font-light text-gray-700 mb-2">no photos match your filters</p>
          <p className="text-gray-500 font-light">try selecting different tags or years, or clear the filters</p>
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-20">
          <Heart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-2xl font-light text-gray-700 mb-2">no memories yet</p>
          <p className="text-gray-500 font-light">be the first to share a photo</p>
        </div>
      )}

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] bg-white border border-gray-300 p-0 overflow-hidden [&>button]:hidden">
          {selectedPhoto && (
            <PhotoModal
              photo={selectedPhoto}
              user={localUser}
              onUpdate={(updatedPhoto) => {
                onPhotoUpdate(updatedPhoto)
                setSelectedPhoto(updatedPhoto)
              }}
              onClose={() => setSelectedPhoto(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          console.log("Closing auth modal")
          setShowAuthModal(false)
        }}
        onSuccess={handleAuthModalSuccess}
      />
    </div>
  )
}
