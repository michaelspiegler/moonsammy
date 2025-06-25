"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Save, ArrowLeft, Camera, User, RefreshCw, Upload, Heart, MessageCircle, Calendar, Palette } from "lucide-react"
import { ThemeSelector } from "./theme-selector"

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
  const [activeTab, setActiveTab] = useState<"profile" | "uploads" | "themes">("profile")

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/user")
        if (!response.ok) {
          throw new Error("Failed to fetch user")
        }
        const data = await response.json()
        setUser(data)
        setName(data.name)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  useEffect(() => {
    if (profileImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(profileImage)
    } else {
      setPreviewUrl(null)
    }
  }, [profileImage])

  useEffect(() => {
    const fetchUploads = async () => {
      setUploadsLoading(true)
      try {
        const response = await fetch("/api/user/uploads")
        if (!response.ok) {
          throw new Error("Failed to fetch uploads")
        }
        const data = await response.json()
        setUploads(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setUploadsLoading(false)
      }
    }

    fetchUploads()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImage(file)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("name", name)
      if (profileImage) {
        formData.append("profileImage", profileImage)
      }

      const response = await fetch("/api/user/update", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      // Optimistically update the user state
      setUser((prevUser) => {
        if (prevUser) {
          return { ...prevUser, name: name, profileImage: previewUrl || prevUser.profileImage }
        }
        return prevUser // If prevUser is null, just return it
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBackToGallery = () => {
    router.push("/")
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Logout failed")
      }

      router.push("/login")
    } catch (error: any) {
      console.error("Logout error:", error)
      setError(error.message || "Logout failed")
    }
  }

  const handleSyncWithGithub = async () => {
    setSyncing(true)
    setError(null)

    try {
      const response = await fetch("/api/sync-github", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to sync with GitHub")
      }

      // Optimistically update the user state
      setUser((prevUser) => {
        if (prevUser) {
          return { ...prevUser }
        }
        return prevUser // If prevUser is null, just return it
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen theme-bg">
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
            Profile/Settings
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
          <button
            onClick={() => setActiveTab("themes")}
            className={`px-4 py-2 rounded-md font-light transition-colors ${
              activeTab === "themes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Palette className="h-4 w-4 inline mr-2" />
            Themes
          </button>
        </div>

        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <div className="text-red-500">{error}</div>}
              <div className="flex items-center space-x-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden">
                  <Image
                    src={previewUrl || user?.profileImage || "/placeholder-profile.png"}
                    alt="Profile Preview"
                    fill
                    className="object-cover"
                  />
                  <label
                    htmlFor="profileImage"
                    className="absolute inset-0 bg-black opacity-50 hover:opacity-75 transition-opacity cursor-pointer flex items-center justify-center"
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </label>
                  <Input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user?.name || "Loading..."}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <Input type="text" id="name" value={name} onChange={handleNameChange} className="mt-1 block w-full" />
              </div>
              <div className="flex justify-between">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      Saving <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Save Profile <Save className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button onClick={handleSyncWithGithub} disabled={syncing} variant="secondary">
                  {syncing ? (
                    <>
                      Syncing <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>Sync with Github</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "uploads" && (
          <Card>
            <CardHeader>
              <CardTitle>My Uploads</CardTitle>
              <CardDescription>Manage your uploaded content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadsLoading ? (
                <p>Loading uploads...</p>
              ) : uploads.length === 0 ? (
                <p>No uploads yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="relative">
                      <Image
                        src={upload.url || "/placeholder.svg"}
                        alt={upload.filename}
                        width={500}
                        height={300}
                        className="object-cover rounded-md aspect-video"
                      />
                      <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white p-2 rounded-b-md">
                        <h4 className="font-semibold">{upload.title}</h4>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4" />
                            <span>{upload.likeCount}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="h-4 w-4" />
                            <span>{upload.commentCount}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(upload.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "themes" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-700 font-light">
                <Palette className="h-5 w-5" />
                <span>App Themes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
