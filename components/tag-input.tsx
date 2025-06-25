"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tag, Plus, Check } from "lucide-react"

interface TagSuggestion {
  id: string
  name: string
  usageCount: number
}

interface TagInputProps {
  onAddTag: (tagName: string) => Promise<void>
  onCancel: () => void
  loading?: boolean
  placeholder?: string
}

export function TagInput({ onAddTag, onCancel, loading = false, placeholder = "Add a tag..." }: TagInputProps) {
  const [tagInput, setTagInput] = useState("")
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const searchTags = async () => {
      if (tagInput.trim().length > 0) {
        try {
          const response = await fetch(`/api/tags/search?q=${encodeURIComponent(tagInput.trim())}`)
          const data = await response.json()
          if (data.tags) {
            setSuggestions(data.tags)
            setShowSuggestions(true)
          }
        } catch (error) {
          console.error("Error searching tags:", error)
        }
      } else {
        // Show popular tags when input is empty
        try {
          const response = await fetch("/api/tags/search")
          const data = await response.json()
          if (data.tags) {
            setSuggestions(data.tags)
            setShowSuggestions(true)
          }
        } catch (error) {
          console.error("Error fetching popular tags:", error)
        }
      }
    }

    const debounceTimer = setTimeout(searchTags, 300)
    return () => clearTimeout(debounceTimer)
  }, [tagInput])

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectTag(suggestions[selectedIndex].name)
      } else if (tagInput.trim()) {
        handleAddTag()
      }
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const handleSelectTag = (tagName: string) => {
    setTagInput(tagName)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    handleAddTag(tagName)
  }

  const handleAddTag = async (tagName?: string) => {
    const finalTagName = tagName || tagInput.trim()
    if (!finalTagName) return

    try {
      await onAddTag(finalTagName)
      setTagInput("")
      setShowSuggestions(false)
      setSelectedIndex(-1)
    } catch (error) {
      console.error("Error adding tag:", error)
    }
  }

  return (
    <div className="relative">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="text-sm"
            disabled={loading}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelectTag(suggestion.name)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                    index === selectedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Tag className="h-3 w-3" />
                    <span>{suggestion.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {suggestion.usageCount > 0 ? `${suggestion.usageCount} photos` : "new"}
                  </span>
                </button>
              ))}

              {/* Add new tag option if input doesn't match existing */}
              {tagInput.trim() && !suggestions.some((s) => s.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                <button
                  onClick={() => handleAddTag()}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 border-t border-gray-100 ${
                    selectedIndex === suggestions.length ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <Plus className="h-3 w-3" />
                  <span>Create "{tagInput.trim()}"</span>
                </button>
              )}
            </div>
          )}
        </div>

        <Button onClick={() => handleAddTag()} disabled={!tagInput.trim() || loading} size="sm" className="px-3">
          {loading ? "..." : <Check className="h-4 w-4" />}
        </Button>
      </div>

      <Button onClick={onCancel} variant="ghost" size="sm" className="mt-2 text-xs text-gray-500 p-0">
        Cancel
      </Button>
    </div>
  )
}
