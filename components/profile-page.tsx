"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Save, User, Camera } from "lucide-react"

interface ProfilePageProps {
  user: any
  onBack: () => void
}

export function ProfilePage({ user, onBack }: ProfilePageProps) {
  const [name, setName] = useState(user?.name || "")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImage || "")
  const [previewUrl, setPreviewUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploads, setUploads] = useState([])
  const [uploadsLoading, setUploadsLoading] = useState(true)

  useEffect(() => {
    fetchUserUploads()
  }, [])

  const fetchUserUploads = async () => {
    try {
      const sessionToken = localStorage.getItem("sessionToken") || getCookie("session") || getCookie("auth-session")

      if (!sessionToken) {
        setUploadsLoading(false)
        return
      }

      const response = await fetch("/api/profile/uploads", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "x-session-token": sessionToken,
        },
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setUploads(data.uploads || [])
      } else {
        console.error("Failed to fetch uploads")
      }
    } catch (error) {
      console.error("Error fetching uploads:", error)
    } finally {
      setUploadsLoading(false)
    }
  }

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(";").shift()
    return null
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
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const sessionToken = localStorage.getItem("sessionToken") || getCookie("session") || getCookie("auth-session")

      if (!sessionToken) {
        setError("Please log in again")
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append("name", name)
      if (profileImage) {
        formData.append("profileImage", profileImage)
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "x-session-token": sessionToken,
        },
        credentials: "include",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Profile updated successfully!")
        if (data.user?.profileImage) {
          setProfileImageUrl(data.user.profileImage)
        }
        // Clear the preview
        setPreviewUrl("")
        setProfileImage(null)
      } else {
        setError(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Profile update error:", error)
      setError("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-container">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button onClick={onBack} variant="outline">
            ← Back to Gallery
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image */}
              <div className="text-center">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={previewUrl || profileImageUrl} alt={name || "Profile"} className="object-cover" />
                    <AvatarFallback className="text-lg">{name ? name.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Click the camera icon to change your profile picture
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              {/* Error/Success Messages */}
              {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}
              {success && <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">{success}</div>}

              {/* Save Button */}
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Upload History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Your Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uploadsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading uploads...</p>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No uploads yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Photos you upload will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {uploads.map((upload: any) => (
                    <div key={upload.id} className="relative group">
                      <img
                        src={upload.url || "/placeholder.svg"}
                        alt={upload.title || "Upload"}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <p className="text-white text-xs text-center px-2">{upload.title || "No caption"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
