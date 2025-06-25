"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, ImageIcon, CheckCircle, AlertCircle, Clock, User, UserPlus, Lock } from "lucide-react"
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
      console.log("🔍 Upload Section: Checking auth status, localStorage token:", sessionToken ? "exists" : "missing")

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
      console.log("🔍 Upload Section: Auth check response:", data)

      if (data.user) {
        setLocalUser(data.user)
        onAuthChange?.(data.user)
        console.log("🔍 Upload Section: ✅ User authenticated:", data.user.name)

        // Update localStorage with fresh session token if provided
        if (data.user.sessionToken) {
          localStorage.setItem("sessionToken", data.user.sessionToken)
          console.log("🔍 Upload Section: ✅ Updated localStorage with fresh session token")
        }
      } else {
        console.log("🔍 Upload Section: ❌ No user found in auth response")
      }
    } catch (error) {
      console.error("🔍 Upload Section: ❌ Auth check failed:", error)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    console.log("🔍 Upload Section: Starting upload, current user:", localUser?.name || "none")

    if (!localUser) {
      console.log("🔍 Upload Section: No user, showing auth modal")
      setShowAuthModal(true)
      return
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
      formData.append("uploaderName", localUser.name)

      setProgress(`Uploading ${files.length} files slowly to avoid rate limits...`)

      // Include session token in headers for authentication
      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {}
      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      console.log("🔍 Upload Section: Making upload request")
      console.log("  - Session token:", sessionToken ? sessionToken.substring(0, 30) + "..." : "missing")
      console.log("  - Current user:", localUser.name)
      console.log("  - Files count:", files.length)

      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include", // Include cookies
        headers,
        body: formData,
      })

      console.log("🔍 Upload Section: Upload response status:", response.status)

      // Handle authentication errors
      if (response.status === 401) {
        console.log("🔍 Upload Section: ❌ Authentication failed, showing login modal")
        setError("Authentication expired. Please sign in again.")
        setLocalUser(null) // Clear local user state
        onAuthChange?.(null) // Notify parent
        localStorage.removeItem("sessionToken") // Clear localStorage
        setShowAuthModal(true)
        setProgress("")
        return
      }

      // Handle rate limit responses
      if (response.status === 429) {
        setIsRateLimited(true)
        setError("Rate limit reached. Please wait a few minutes before uploading again.")
        setProgress("")
        return
      }

      const data = await response.json()
      console.log("🔍 Upload Section: Upload response data:", data)

      if (response.ok) {
        setResult(data)
        setProgress("")

        // CRITICAL: Check auth status immediately after successful upload
        console.log("🔍 Upload Section: Upload successful, immediately checking auth status...")
        setTimeout(() => {
          checkAuthStatus()
        }, 100) // Check almost immediately

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
      console.error("🔍 Upload Section: ❌ Upload error:", error)
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
    console.log("🔍 Upload Section: ✅ Auth success received:", userData)
    setLocalUser(userData)
    onAuthChange?.(userData)
    setShowAuthModal(false)

    // Store session token
    if (userData.sessionToken) {
      localStorage.setItem("sessionToken", userData.sessionToken)
      console.log("🔍 Upload Section: ✅ Stored session token in localStorage")
    }
  }

  const currentUser = localUser || user

  return (
    <div className="space-y-6">
      {/* User Section */}
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
      ) : (
        // Show login required message
        <div className="max-w-md mx-auto p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Lock className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 font-medium text-sm">
              Sign in required to upload photos and interact with memories
            </span>
          </div>

          <Button
            onClick={() => setShowAuthModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-light"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account / Sign In
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            All features require an account for security and attribution
          </p>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed p-12 text-center transition-all duration-300 ${
          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"
        } ${!currentUser ? "opacity-50" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-6" />
        <p className="text-xl font-light text-gray-700 mb-2">
          {currentUser ? "drag photos here" : "sign in to upload photos"}
        </p>
        <p className="text-gray-500 mb-2 font-light">
          {currentUser ? "or click to browse" : "authentication required"}
        </p>
        <p className="text-gray-400 text-sm mb-8 font-light">
          {isRateLimited
            ? "rate limited - please wait before uploading"
            : currentUser
              ? "supports up to 50 images at once"
              : "create an account to get started"}
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
          disabled={uploading || isRateLimited || !currentUser}
          onClick={() => {
            if (!currentUser) {
              setShowAuthModal(true)
            } else {
              document.getElementById("file-upload")?.click()
            }
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading
            ? "uploading..."
            : isRateLimited
              ? "rate limited"
              : !currentUser
                ? "sign in to upload"
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
