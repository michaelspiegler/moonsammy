"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tag, Calendar, X } from "lucide-react"

interface TagData {
  id: string
  name: string
  photoCount: number
}

interface YearData {
  year: number
  photoCount: number
}

interface PhotoFilterProps {
  onFilter: (tags: string[], years: number[]) => void
  activeTags: string[]
  activeYears: number[]
}

export function PhotoFilter({ onFilter, activeTags, activeYears }: PhotoFilterProps) {
  const [tags, setTags] = useState<TagData[]>([])
  const [years, setYears] = useState<YearData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchTags(), fetchYears()])
  }, [])

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags")
      const data = await response.json()
      if (data.tags) {
        setTags(data.tags)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    }
  }

  const fetchYears = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/years")
      const data = await response.json()
      if (data.years) {
        setYears(data.years)
      }
    } catch (error) {
      console.error("Error fetching years:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = (tagName: string) => {
    if (activeTags.includes(tagName)) {
      const newTags = activeTags.filter((tag) => tag !== tagName)
      onFilter(newTags, activeYears)
    } else {
      const newTags = [...activeTags, tagName]
      onFilter(newTags, activeYears)
    }
  }

  const handleYearClick = (year: number) => {
    if (activeYears.includes(year)) {
      const newYears = activeYears.filter((y) => y !== year)
      onFilter(activeTags, newYears)
    } else {
      const newYears = [...activeYears, year]
      onFilter(activeTags, newYears)
    }
  }

  const handleRemoveTag = (tagName: string) => {
    const newTags = activeTags.filter((tag) => tag !== tagName)
    onFilter(newTags, activeYears)
  }

  const handleRemoveYear = (year: number) => {
    const newYears = activeYears.filter((y) => y !== year)
    onFilter(activeTags, newYears)
  }

  const handleClearAll = () => {
    onFilter([], [])
  }

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Tag className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600 font-medium">Loading filters...</span>
        </div>
      </div>
    )
  }

  if (tags.length === 0 && years.length === 0) {
    return null
  }

  const hasActiveFilters = activeTags.length > 0 || activeYears.length > 0

  return (
    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-gray-600" />
          <span className="text-gray-700 font-medium">Filter photos:</span>
        </div>
        {hasActiveFilters && (
          <Button onClick={handleClearAll} variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 p-1">
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Selected Filters */}
      {hasActiveFilters && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-blue-700 font-medium text-sm">Active filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTags.map((tagName) => (
              <div
                key={`tag-${tagName}`}
                className="inline-flex items-center bg-blue-600 text-white text-sm px-3 py-1 rounded-full"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tagName}
                <button
                  onClick={() => handleRemoveTag(tagName)}
                  className="ml-2 hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {activeYears.map((year) => (
              <div
                key={`year-${year}`}
                className="inline-flex items-center bg-green-600 text-white text-sm px-3 py-1 rounded-full"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {year}
                <button
                  onClick={() => handleRemoveYear(year)}
                  className="ml-2 hover:bg-green-700 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Section */}
      {tags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Tag className="h-4 w-4 text-gray-600" />
            <span className="text-gray-700 font-medium text-sm">Tags:</span>
          </div>
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
        </div>
      )}

      {/* Years Section */}
      {years.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="text-gray-700 font-medium text-sm">Years:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {years.map((yearData) => {
              const isSelected = activeYears.includes(yearData.year)
              return (
                <Button
                  key={yearData.year}
                  onClick={() => handleYearClick(yearData.year)}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`font-light ${
                    isSelected
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {yearData.year}
                  <span className="ml-1 text-xs opacity-75">({yearData.photoCount})</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="mt-3 text-sm text-gray-600">
          Showing photos{" "}
          {activeTags.length > 0 && activeYears.length > 0
            ? `tagged with any of: ${activeTags.map((tag) => `"${tag}"`).join(", ")} and from years: ${activeYears.join(", ")}`
            : activeTags.length > 0
              ? `tagged with any of: ${activeTags.map((tag) => `"${tag}"`).join(", ")}`
              : `from years: ${activeYears.join(", ")}`}
        </div>
      )}
    </div>
  )
}
