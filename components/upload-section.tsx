"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, ImageIcon, CheckCircle, AlertCircle, Clock, User, UserPlus } from "lucide-react"
import { AuthModal } from "./auth-modal"

interface UploadResult {
  success: boolean
  successCount: number
  errorCount: number
  message: string
  errors?: Array<{ file: string; error: string }>
}

interface UploadSectionProps {
  user?: any
  onAuthChange?: (user: any) => void
}

export function UploadSection({ user, onAuthChange }: UploadSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [progress, setProgress] = useState<string>("")
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [uploaderName, setUploaderName] = useState("")
  const [tempName, setTempName] = useState("")
  const [localUser, setLocalUser] = useState<any>(user)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Update local user when prop changes
  useEffect(() => {
    setLocalUser(user)
  }, [user])

  // Check for existing user session if not passed as prop
  useEffect(() => {
    if (!user) {
      checkAuthStatus()
    }
  }, [user])

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
        cache: "no-store",
        headers,
      })
      const data = await response.json()
      if (data.user) {
        setLocalUser(data.user)
        onAuthChange?.(data.user)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    }
  }

  // Load uploader name from localStorage only if not logged in
  useEffect(() => {
    if (!localUser) {
      const savedName = localStorage.getItem("uploaderName")
      if (savedName) {
        setUploaderName(savedName)
      }
    }
  }, [localUser])

  const handleSetName = () => {
    if (tempName.trim().length >= 2) {
      const finalName = tempName.trim()
      setUploaderName(finalName)
      localStorage.setItem("uploaderName", finalName)
      setTempName("")
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    // Determine the uploader name
    const finalUploaderName = localUser ? localUser.name : uploaderName.trim()

    if (!finalUploaderName || finalUploaderName.length < 2) {
      setError("Please enter your name (at least 2 characters) or sign in before uploading photos.")
      return
    }

    // Save uploader name to localStorage if not logged in
    if (!localUser && uploaderName.trim()) {
      localStorage.setItem("uploaderName", uploaderName.trim())
    }

    // Reduce max files due to rate limits
    if (files.length > 50) {
      setError(`Too many files! Please select up to 50 images to avoid rate limits. You selected ${files.length}.`)
      return
    }

    // Warn about rate limits for large uploads
    if (files.length > 20) {
      const proceed = confirm(
        `You're uploading ${files.length} files. Due to rate limits, this will be processed slowly in small batches. Continue?`,
      )
      if (!proceed) return
    }

    setUploading(true)
    setError(null)
    setResult(null)
    setIsRateLimited(false)
    setProgress(`Preparing to upload ${files.length} files...`)

    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("files", file)
      })
      // Add uploader name to the form data
      formData.append("uploaderName", finalUploaderName)

      setProgress(`Uploading ${files.length} files slowly to avoid rate limits...`)

      // Include session token in headers for authentication
      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {}
      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include", // Include cookies
        headers,
        body: formData,
      })

      // Handle rate limit responses
      if (response.status === 429) {
        setIsRateLimited(true)
        setError("Rate limit reached. Please wait a few minutes before uploading again.")
        setProgress("")
        return
      }

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        setProgress("")

        // Instead of auto-refresh, just show success and let user manually refresh
        if (data.successCount > 0) {
          setTimeout(() => {
            // Don't auto-refresh, just show a message
            setProgress("Upload complete! The page will refresh to show your new photos.")
            setTimeout(() => {
              // Use location.reload() to preserve session
              window.location.reload()
            }, 2000)
          }, 1000)
        }
      } else {
        setError(data.error || "Upload failed")
        setProgress("")
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError("Upload failed. Please check your connection and try again.")
      setProgress("")
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleUpload(e.dataTransfer.files)
  }

  const handleAuthSuccess = async (userData: any) => {
    console.log("🔍 Upload section: Auth success received:", userData)
    setLocalUser(userData)
    onAuthChange?.(userData)
    setShowAuthModal(false)

    // Store session token
    if (userData.sessionToken) {
      localStorage.setItem("sessionToken", userData.sessionToken)
      console.log("🔍 Upload section: Stored session token")
    }
  }

  const currentUser = localUser || user
  const canUpload = currentUser || uploaderName.trim().length >= 2

  return (
    <div className="space-y-6">
      {/* User/Name Section */}
      {currentUser ? (
        // Show logged-in user info
        <div className="max-w-md mx-auto p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            {currentUser.profileImage ? (
              <img
                src={currentUser.profileImage || "/placeholder.svg"}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-green-600" />
            )}
            <span className="text-green-700 font-medium">
              Uploading as: <strong>{currentUser.name}</strong>
            </span>
          </div>
          <p className="text-green-600 text-sm mt-1">Your photos will be attributed to your account</p>
          {currentUser.profileImage && (
            <p className="text-green-500 text-xs mt-1">✓ Profile picture will appear on uploaded photos</p>
          )}
        </div>
      ) : !uploaderName.trim() ? (
        // Show name/auth options when not logged in and no name set
        <div className="max-w-md mx-auto p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <User className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 font-medium text-sm">
              Set your name to upload photos and interact with memories
            </span>
          </div>

          {/* Quick Name Option */}
          <div className="space-y-3 mb-4">
            <p className="text-xs text-gray-600 font-medium">Quick Option:</p>
            <div className="flex space-x-2">
              <Input
                placeholder="Your name (for uploads, comments, and likes)"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tempName.trim().length >= 2) {
                    handleSetName()
                  }
                }}
              />
              <Button onClick={handleSetName} disabled={tempName.trim().length < 2} size="sm" className="px-4">
                Set Name
              </Button>
            </div>
          </div>

          {/* Account Option */}
          <div className="pt-3 border-t border-blue-200">
            <p className="text-xs text-gray-600 font-medium mb-2">Or sign in for full features:</p>
            <Button onClick={() => setShowAuthModal(true)} variant="outline" size="sm" className="w-full font-light">
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account / Sign In
            </Button>
            <p className="text-xs text-gray-500 mt-1 text-center">Profile picture, upload tracking, and more</p>
          </div>
        </div>
      ) : (
        // Show current name when set but not logged in
        <div className="max-w-md mx-auto p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700 font-medium text-sm">
                Uploading as: <strong>{uploaderName}</strong>
              </span>
            </div>
            <Button
              onClick={() => {
                setUploaderName("")
                localStorage.removeItem("uploaderName")
              }}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              Change
            </Button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed p-12 text-center transition-all duration-300 ${
          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-6" />
        <p className="text-xl font-light text-gray-700 mb-2">drag photos here</p>
        <p className="text-gray-500 mb-2 font-light">or click to browse</p>
        <p className="text-gray-400 text-sm mb-8 font-light">
          {isRateLimited ? "rate limited - please wait before uploading" : "supports up to 50 images at once"}
        </p>

        <Input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <Button
          variant="outline"
          className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 font-light px-8 py-3 transition-all duration-200"
          disabled={uploading || isRateLimited || !canUpload}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading
            ? "uploading..."
            : isRateLimited
              ? "rate limited"
              : !canUpload
                ? "enter name or sign in"
                : "select photos"}
        </Button>

        {progress && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-700 font-light">{progress}</p>
            {uploading && (
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded flex items-start space-x-3">
          {isRateLimited ? (
            <Clock className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="text-red-600 font-light">{error}</p>
            <p className="text-red-500 text-sm mt-1 font-light">
              {isRateLimited
                ? "wait a few minutes before trying again"
                : "try with fewer files or check your connection"}
            </p>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`border p-4 rounded flex items-start space-x-3 ${
            result.errorCount === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <CheckCircle
            className={`h-5 w-5 mt-0.5 flex-shrink-0 ${result.errorCount === 0 ? "text-green-500" : "text-yellow-500"}`}
          />
          <div>
            <p className={`font-light ${result.errorCount === 0 ? "text-green-600" : "text-yellow-600"}`}>
              {result.message}
            </p>
            {result.errorCount > 0 && result.errors && (
              <div className="mt-2 text-sm text-yellow-600">
                <p className="font-medium">Some files failed:</p>
                <ul className="mt-1 space-y-1">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <li key={i} className="truncate">
                      • {err.file}
                    </li>
                  ))}
                  {result.errors.length > 3 && <li>• ... and {result.errors.length - 3} more</li>}
                </ul>
              </div>
            )}
            <p className="text-gray-500 text-sm mt-2 font-light">
              {result.errorCount === 0 ? "refreshing page..." : "page will refresh with successful uploads"}
            </p>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
