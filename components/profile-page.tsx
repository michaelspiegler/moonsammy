"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, ArrowLeft, Camera, User, RefreshCw, Upload, Heart, MessageCircle, Calendar } from "lucide-react"

interface UserType {
  id: string
  name: string
  email: string
  profileImage?: string
}

interface UserUpload {
  id: string
  url: string
  filename: string
  title: string
  uploadedAt: string
  commentCount: number
  likeCount: number
}

export function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [uploads, setUploads] = useState<UserUpload[]>([])
  const [uploadsLoading, setUploadsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "uploads">("profile")

  useEffect(() => {
    console.log("🔍 Profile page mounted, fetching profile...")
    fetchProfile()
  }, [])

  useEffect(() => {
    if (activeTab === "uploads" && user) {
      fetchUploads()
    }
  }, [activeTab, user])

  const fetchProfile = async () => {
    try {
      console.log("🔍 Calling /api/profile...")

      // Get session token from localStorage as backup
      const sessionToken = localStorage.getItem("sessionToken")
      console.log("🔍 Session token from localStorage:", sessionToken ? "exists" : "missing")

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      // Add session token to headers if available
      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers,
      })

      console.log("🔍 Profile API response status:", response.status)
      console.log("🔍 Profile API response headers:", Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log("🔍 Profile API response data:", data)

      if (response.ok && data.user) {
        console.log("🔍 Profile page: loaded user data successfully:", data.user)
        setUser(data.user)
        setName(data.user.name)
        setPreviewUrl(data.user.profileImage || null)
        setError(null)
      } else {
        console.log("🔍 Profile page: no user data or error:", data)
        setError(data.error || "Failed to load profile")
      }
    } catch (error) {
      console.error("🔍 Error fetching profile:", error)
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const fetchUploads = async () => {
    setUploadsLoading(true)
    try {
      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/profile/uploads", {
        method: "GET",
        credentials: "include",
        headers,
      })

      const data = await response.json()

      if (response.ok) {
        setUploads(data.uploads || [])
      } else {
        console.error("Failed to fetch uploads:", data.error)
      }
    } catch (error) {
      console.error("Error fetching uploads:", error)
    } finally {
      setUploadsLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImage(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      alert("Name must be at least 2 characters")
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      if (profileImage) {
        formData.append("profileImage", profileImage)
      }

      // Get session token for headers
      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {}
      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers,
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(data.user)
        setProfileImage(null)

        // Enhanced success message
        if (profileImage) {
          alert("Profile updated successfully! Your new profile picture will appear on all your uploaded photos.")
        } else {
          alert("Profile updated successfully!")
        }
      } else {
        alert(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      localStorage.removeItem("sessionToken")
      window.location.href = "/"
    } catch (error) {
      console.error("Logout error:", error)
      localStorage.removeItem("sessionToken")
      window.location.href = "/"
    }
  }

  const handleBackToGallery = () => {
    console.log("🔍 Navigating back to gallery...")
    // Use window.location instead of router to preserve session
    window.location.href = "/"
  }

  const handleSyncUploads = async () => {
    if (!user?.profileImage) {
      alert("You need a profile picture to sync with your uploads")
      return
    }

    if (!confirm("This will update all your uploaded photos to show your current profile picture. Continue?")) {
      return
    }

    setSyncing(true)
    try {
      // Get session token for headers
      const sessionToken = localStorage.getItem("sessionToken")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (sessionToken) {
        headers["x-session-token"] = sessionToken
      }

      const response = await fetch("/api/profile/sync-uploads", {
        method: "POST",
        credentials: "include",
        headers,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(data.message)
      } else {
        alert(data.error || "Failed to sync uploads")
      }
    } catch (error) {
      console.error("Error syncing uploads:", error)
      alert("Failed to sync uploads")
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
          <p className="mt-4 text-gray-500 font-light">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-light text-red-800 mb-4">Profile Access Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={handleBackToGallery} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gallery
              </Button>
              <Button onClick={fetchProfile} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>

            {/* Debug info */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>Error: {error}</p>
              <p>Browser Cookies: {document.cookie ? "Present" : "None"}</p>
              <p>Session Token: {localStorage.getItem("sessionToken") ? "Present" : "None"}</p>
              <p>Time: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button onClick={handleBackToGallery} variant="ghost" className="font-light">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gallery
          </Button>
          <Button onClick={handleLogout} variant="outline" className="font-light">
            Logout
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-md font-light transition-colors ${
              activeTab === "profile" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Profile Settings
          </button>
          <button
            onClick={() => setActiveTab("uploads")}
            className={`px-4 py-2 rounded-md font-light transition-colors ${
              activeTab === "uploads" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            My Uploads ({uploads.length})
          </button>
        </div>

        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-700 font-light">
                <User className="h-5 w-5" />
                <span>My Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                    {previewUrl ? (
                      <Image
                        src={previewUrl || "/placeholder.svg"}
                        alt="Profile"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2 font-light">
                  Click the camera icon to change your profile picture
                </p>
                <p className="text-xs text-blue-600 mt-1 font-light">
                  Your profile picture will appear on photos you upload
                </p>
              </div>

              {/* Profile Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="font-light"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <Input value={user?.email || ""} disabled className="font-light bg-gray-50" />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-between items-center">
                <Button
                  onClick={handleSyncUploads}
                  disabled={syncing || !user?.profileImage}
                  variant="outline"
                  className="font-light"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync Profile to Uploads"}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || name.trim().length < 2}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-light px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "uploads" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-700 font-light">
                <Upload className="h-5 w-5" />
                <span>My Uploads</span>
                <span className="text-sm font-normal text-gray-500">({uploads.length} photos)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uploadsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
                  <p className="mt-4 text-gray-500 font-light">Loading your uploads...</p>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-light">You haven't uploaded any photos yet</p>
                  <Button onClick={handleBackToGallery} variant="outline" className="mt-4 font-light">
                    Upload Your First Photo
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                      <div className="aspect-square relative">
                        <Image
                          src={upload.url || "/placeholder.svg"}
                          alt={upload.title || upload.filename}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4">
                        {upload.title && (
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{upload.title}</h3>
                        )}
                        <p className="text-sm text-gray-600 mb-3 line-clamp-1">{upload.filename}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-3">
                            <span className="flex items-center">
                              <Heart className="h-3 w-3 mr-1" />
                              {upload.likeCount}
                            </span>
                            <span className="flex items-center">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {upload.commentCount}
                            </span>
                          </div>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(upload.uploadedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
