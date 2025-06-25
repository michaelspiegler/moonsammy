"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { PhotoModal } from "./photo-modal"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Tag } from "lucide-react"
import { PhotoFilter } from "./photo-filter"

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
  tags?: PhotoTag[]
  comments?: Comment[]
}

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
}

interface PhotoResponse {
  photos: Photo[]
  totalPhotos: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  error?: string
  retryAfter?: number
}

export function PhotoGallery() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalPhotos, setTotalPhotos] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [activeYears, setActiveYears] = useState<number[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([])

  useEffect(() => {
    fetchPhotos(currentPage)
  }, [currentPage])

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

  const fetchPhotos = async (page: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/photos?page=${page}&limit=24`)

      // Handle non-JSON responses (like rate limit HTML pages)
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response - possible rate limit")
      }

      const data: PhotoResponse = await response.json()

      if (data.error) {
        setError(data.error)
        if (data.retryAfter) {
          setRetryAfter(data.retryAfter)
        }
      } else {
        setPhotos(data.photos)
        setFilteredPhotos(data.photos)
        setTotalPhotos(data.totalPhotos)
        setTotalPages(data.totalPages)
        setHasNextPage(data.hasNextPage)
        setHasPrevPage(data.hasPrevPage)
      }
    } catch (error) {
      console.error("Error fetching photos:", error)
      if (error instanceof Error && error.message.includes("JSON")) {
        setError("Service temporarily unavailable. Please wait a moment and try again.")
        setRetryAfter(30)
      } else {
        setError("Failed to load photos")
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpdate = (updatedPhoto: Photo) => {
    setPhotos(photos.map((photo) => (photo.id === updatedPhoto.id ? updatedPhoto : photo)))
    if (selectedPhoto?.id === updatedPhoto.id) {
      setSelectedPhoto(updatedPhoto)
    }
  }

  const handleRetry = () => {
    fetchPhotos(currentPage)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleFilter = (tags: string[], years: number[]) => {
    setActiveTags(tags)
    setActiveYears(years)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const showPages = 5 // Show 5 page numbers at most

    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
    const endPage = Math.min(totalPages, startPage + showPages - 1)

    // Adjust start if we're near the end
    if (endPage - startPage + 1 < showPages) {
      startPage = Math.max(1, endPage - showPages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-12">
        <Button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          variant="outline"
          size="sm"
          className="font-light"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {startPage > 1 && (
          <>
            <Button onClick={() => handlePageChange(1)} variant="outline" size="sm" className="font-light">
              1
            </Button>
            {startPage > 2 && <span className="text-gray-400">...</span>}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            onClick={() => handlePageChange(page)}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            className={`font-light ${
              page === currentPage ? "bg-gray-800 text-white" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
            <Button onClick={() => handlePageChange(totalPages)} variant="outline" size="sm" className="font-light">
              {totalPages}
            </Button>
          </>
        )}

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
    )
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
        <p className="mt-4 text-gray-500 font-light">loading memories...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-gray-50 border border-gray-200 p-8">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-2xl font-light text-gray-700 mb-4">temporarily unavailable</h3>
        <p className="text-gray-600 mb-6 font-light">{error}</p>

        {retryAfter && (
          <p className="text-gray-500 text-sm mb-6 font-light">Please wait {retryAfter} seconds before trying again</p>
        )}

        <Button onClick={handleRetry} variant="outline" className="font-light">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl font-light text-gray-700 mb-2">no photos yet</p>
        <p className="text-gray-500 font-light">be the first to share a memory</p>
      </div>
    )
  }

  return (
    <>
      {/* Photo Filter */}
      <PhotoFilter onFilter={handleFilter} activeTags={activeTags} activeYears={activeYears} />

      {/* Gallery Stats */}
      <div className="text-center mb-8">
        <p className="text-gray-500 font-light">
          {activeTags.length > 0 || activeYears.length > 0
            ? `${filteredPhotos.length} memories with selected filters`
            : `${totalPhotos} memories`}{" "}
          • page {currentPage} of {totalPages}
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square cursor-pointer transform transition-all duration-300 hover:scale-105 group"
            onClick={() => setSelectedPhoto(photo)}
          >
            <Image
              src={photo.url || "/placeholder.svg"}
              alt={photo.title || `Memory ${index + 1}`}
              fill
              className="object-cover border border-gray-200 group-hover:border-gray-400 transition-all duration-300"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300 flex items-center justify-center">
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

            {/* Title overlay */}
            {photo.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white text-sm font-light truncate">{photo.title}</p>
              </div>
            )}

            {/* Year badge */}
            {photo.year && (
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{photo.year}</div>
            )}

            {/* Tags indicator */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                <Tag className="h-3 w-3 mr-1" />
                {photo.tags.length}
              </div>
            )}

            {/* Comment indicator */}
            {photo.comments && photo.comments.length > 0 && (
              <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                {photo.comments.length}
              </div>
            )}
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

      {/* Pagination */}
      {renderPagination()}

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] bg-white border border-gray-300 p-0 overflow-hidden">
          {selectedPhoto && (
            <PhotoModal photo={selectedPhoto} onUpdate={handlePhotoUpdate} onClose={() => setSelectedPhoto(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
