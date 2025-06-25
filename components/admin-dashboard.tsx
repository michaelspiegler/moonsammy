"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AdminPhotoCard } from "./admin-photo-card"
import { AdminUserManagement } from "./admin-user-management"
import {
  LogOut,
  ImageIcon,
  MessageCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Users,
} from "lucide-react"

interface Photo {
  id: string
  url: string
  filename: string
  uploadedAt: string
  title?: string
  comments?: Comment[]
}

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  photoId: string
}

interface AdminPhotoResponse {
  photos: Photo[]
  totalPhotos: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  error?: string
}

interface AdminCommentsResponse {
  comments: Comment[]
  error?: string
}

export function AdminDashboard() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [allComments, setAllComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalPhotos: 0, totalComments: 0 })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [activeTab, setActiveTab] = useState<"photos" | "users">("photos")

  useEffect(() => {
    fetchData()
  }, [currentPage])

  const fetchData = async (isRetry = false) => {
    try {
      setLoading(true)
      if (!isRetry) {
        setError(null)
      }

      console.log("Admin: Fetching data...")

      // Fetch photos and comments with proper error handling
      const [photosResponse, commentsResponse] = await Promise.allSettled([
        fetch(`/api/admin/photos?page=${currentPage}&limit=20`).then(async (res) => {
          // Check if response is JSON
          const contentType = res.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned non-JSON response - possible rate limit")
          }
          return res.json()
        }),
        fetch("/api/admin/comments").then(async (res) => {
          // Check if response is JSON
          const contentType = res.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned non-JSON response - possible rate limit")
          }
          return res.json()
        }),
      ])

      // Handle photos response
      if (photosResponse.status === "fulfilled") {
        const photosData: AdminPhotoResponse = photosResponse.value

        if (photosData.error) {
          setError(photosData.error)
        } else if (photosData.photos) {
          setPhotos(photosData.photos)
          setTotalPages(photosData.totalPages)
          setHasNextPage(photosData.hasNextPage)
          setHasPrevPage(photosData.hasPrevPage)
          setStats((prev) => ({ ...prev, totalPhotos: photosData.totalPhotos }))
        }
      } else {
        console.error("Admin: Photos fetch failed:", photosResponse.reason)
        setError("Failed to fetch photos: " + (photosResponse.reason?.message || "Unknown error"))
      }

      // Handle comments response
      if (commentsResponse.status === "fulfilled") {
        const commentsData: AdminCommentsResponse = commentsResponse.value

        if (commentsData.error) {
          console.warn("Admin: Comments fetch warning:", commentsData.error)
          // Don't set main error for comments, just log it
          setAllComments([])
          setStats((prev) => ({ ...prev, totalComments: 0 }))
        } else if (commentsData.comments) {
          setAllComments(commentsData.comments)
          setStats((prev) => ({ ...prev, totalComments: commentsData.comments.length }))
        }
      } else {
        console.error("Admin: Comments fetch failed:", commentsResponse.reason)
        setAllComments([])
        setStats((prev) => ({ ...prev, totalComments: 0 }))
      }

      setRetryCount(0) // Reset retry count on success
    } catch (error) {
      console.error("Admin: Error fetching data:", error)
      setError("Failed to load admin data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    fetchData(true)
  }

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    window.location.reload()
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo and all its comments?")) return

    try {
      const response = await fetch(`/api/admin/photos/${encodeURIComponent(photoId)}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Remove from selected photos if it was selected
        const newSelected = new Set(selectedPhotos)
        newSelected.delete(photoId)
        setSelectedPhotos(newSelected)

        // Refresh current page
        fetchData()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete photo")
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert("Failed to delete photo")
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedPhotos.size} selected photos and all their comments?`))
      return

    setBulkDeleting(true)
    const errors = []

    try {
      // Delete photos one by one
      for (const photoId of selectedPhotos) {
        try {
          const response = await fetch(`/api/admin/photos/${encodeURIComponent(photoId)}`, {
            method: "DELETE",
          })
          if (!response.ok) {
            errors.push(photoId)
          }
        } catch (error) {
          errors.push(photoId)
        }
      }

      if (errors.length > 0) {
        alert(`Failed to delete ${errors.length} photos. Please try again.`)
      } else {
        alert(`Successfully deleted ${selectedPhotos.size} photos.`)
      }

      // Clear selection and refresh
      setSelectedPhotos(new Set())
      fetchData()
    } catch (error) {
      console.error("Error in bulk delete:", error)
      alert("Bulk delete failed. Please try again.")
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleDeleteComment = async (commentId: string, photoId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAllComments(allComments.filter((c) => c.id !== commentId))
        setPhotos(
          photos.map((p) => (p.id === photoId ? { ...p, comments: p.comments?.filter((c) => c.id !== commentId) } : p)),
        )
        setStats((prev) => ({ ...prev, totalComments: prev.totalComments - 1 }))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete comment")
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
      alert("Failed to delete comment")
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedPhotos(new Set()) // Clear selection when changing pages
  }

  const handleSelectPhoto = (photoId: string, checked: boolean) => {
    const newSelected = new Set(selectedPhotos)
    if (checked) {
      newSelected.add(photoId)
    } else {
      newSelected.delete(photoId)
    }
    setSelectedPhotos(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPhotos(new Set(photos.map((p) => p.id)))
    } else {
      setSelectedPhotos(new Set())
    }
  }

  if (loading && retryCount === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
        <p className="mt-4 text-gray-500 font-light">Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 font-light">ILM Brian Quain Memorial Gallery</p>
        </div>
        <Button onClick={handleLogout} variant="outline" className="font-light">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          onClick={() => setActiveTab("photos")}
          variant={activeTab === "photos" ? "default" : "ghost"}
          size="sm"
          className="font-light"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Photos & Comments
        </Button>
        <Button
          onClick={() => setActiveTab("users")}
          variant={activeTab === "users" ? "default" : "ghost"}
          size="sm"
          className="font-light"
        >
          <Users className="h-4 w-4 mr-2" />
          User Management
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-600 font-medium">Error Loading Data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              {error.includes("rate limit") && (
                <p className="text-red-400 text-xs mt-2">
                  This is likely due to API rate limits. Please wait a moment before retrying.
                </p>
              )}
            </div>
            <Button onClick={handleRetry} variant="outline" size="sm" className="flex-shrink-0">
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "users" ? (
        <AdminUserManagement />
      ) : (
        <>
          {/* Existing photos management content goes here */}
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-700 font-light">
                  <ImageIcon className="h-5 w-5" />
                  <span>Total Photos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-light text-gray-800">{stats.totalPhotos}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-700 font-light">
                  <MessageCircle className="h-5 w-5" />
                  <span>Total Comments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-light text-gray-800">{stats.totalComments}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-700 font-light">
                  <CheckSquare className="h-5 w-5" />
                  <span>Selected</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-light text-gray-800">{selectedPhotos.size}</p>
                {selectedPhotos.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    variant="destructive"
                    size="sm"
                    className="mt-2 w-full font-light"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {bulkDeleting ? "Deleting..." : `Delete ${selectedPhotos.size} Selected`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Photos Management */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-light text-gray-700">Manage Photos</h2>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedPhotos.size === photos.length && photos.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm text-gray-600 font-light">
                    Select All ({photos.length})
                  </label>
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrevPage}
                    variant="outline"
                    size="sm"
                    className="font-light"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-gray-600 font-light">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasNextPage}
                    variant="outline"
                    size="sm"
                    className="font-light"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {photos.length === 0 && !loading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500 font-light">
                    {error ? "Unable to load photos due to errors above" : "No photos uploaded yet"}
                  </p>
                  {error && (
                    <Button onClick={handleRetry} variant="outline" className="mt-4">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedPhotos.has(photo.id)}
                        onCheckedChange={(checked) => handleSelectPhoto(photo.id, checked as boolean)}
                        className="bg-white border-2 border-gray-300"
                      />
                    </div>
                    <AdminPhotoCard
                      photo={photo}
                      onDelete={() => handleDeletePhoto(photo.id)}
                      onDeleteComment={handleDeleteComment}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
