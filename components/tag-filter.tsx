"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tag, X } from "lucide-react"

interface TagData {
  id: string
  name: string
  photoCount: number
}

interface TagFilterProps {
  onTagFilter: (tagNames: string[]) => void
  activeTags: string[]
}

export function TagFilter({ onTagFilter, activeTags }: TagFilterProps) {
  const [tags, setTags] = useState<TagData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tags")
      const data = await response.json()

      if (data.tags) {
        setTags(data.tags)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = (tagName: string) => {
    if (activeTags.includes(tagName)) {
      // Remove tag if already selected
      const newTags = activeTags.filter((tag) => tag !== tagName)
      onTagFilter(newTags)
    } else {
      // Add tag to selection
      const newTags = [...activeTags, tagName]
      onTagFilter(newTags)
    }
  }

  const handleRemoveTag = (tagName: string) => {
    const newTags = activeTags.filter((tag) => tag !== tagName)
    onTagFilter(newTags)
  }

  const handleClearAll = () => {
    onTagFilter([])
  }

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Tag className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600 font-medium">Loading tags...</span>
        </div>
      </div>
    )
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-gray-600" />
          <span className="text-gray-700 font-medium">Filter by tags:</span>
        </div>
        {activeTags.length > 0 && (
          <Button onClick={handleClearAll} variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 p-1">
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Selected Tags */}
      {activeTags.length > 0 && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-blue-700 font-medium text-sm">Selected tags:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTags.map((tagName) => (
              <div
                key={tagName}
                className="inline-flex items-center bg-blue-600 text-white text-sm px-3 py-1 rounded-full"
              >
                {tagName}
                <button
                  onClick={() => handleRemoveTag(tagName)}
                  className="ml-2 hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = activeTags.includes(tag.name)
          return (
            <Button
              key={tag.id}
              onClick={() => handleTagClick(tag.name)}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={`font-light ${
                isSelected
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {tag.name}
              <span className="ml-1 text-xs opacity-75">({tag.photoCount})</span>
            </Button>
          )
        })}
      </div>

      {activeTags.length > 0 && (
        <div className="mt-3 text-sm text-gray-600">
          Showing photos tagged with{" "}
          {activeTags.length === 1 ? `"${activeTags[0]}"` : `any of: ${activeTags.map((tag) => `"${tag}"`).join(", ")}`}
        </div>
      )}
    </div>
  )
}
