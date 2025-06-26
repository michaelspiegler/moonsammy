"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Save, User, Mail, Camera } from "lucide-react"

interface ProfilePageProps {
  user: any
  onUserUpdate?: (user: any) => void
}

export function ProfilePage({ user, onUserUpdate }: ProfilePageProps) {
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [profileImage, setProfileImage] = useState(user?.profileImage || "")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploads, setUploads] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setProfileImage(user.profileImage || "")
      fetchUserUploads()
    }
  }, [user])

  const fetchUserUploads = async () => {
    try {
      setLoading(true)
      const sessionToken = localStorage.getItem("sessionToken")

      const response = await fetch("/api/profile/uploads", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "x-session-token": sessionToken || "",
        },
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
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const sessionToken = localStorage.getItem("sessionToken")
      if (!sessionToken) {
        setError("No session token found. Please log in again.")
        return
      }

      const formData = new FormData()
      formData.append("name", name)
      formData.append("email", email)

      if (imageFile) {
        formData.append("profileImage", imageFile)
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "x-session-token": sessionToken,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Profile updated successfully!")
        setProfileImage(data.user.profileImage || "")
        setImageFile(null)
        setImagePreview(null)

        // Update user data in parent component
        if (onUserUpdate) {
          onUserUpdate(data.user)
        }

        // Refresh uploads
        fetchUserUploads()
      } else {
        setError(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("An error occurred while updating your profile")
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={imagePreview || profileImage || ""} alt={name} />
              <AvatarFallback className="text-2xl">
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="profile-image" className="cursor-pointer">
                <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                  <Camera className="h-4 w-4" />
                  Change Photo
                </div>
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </Label>
              {imagePreview && (
                <p className="text-sm text-muted-foreground">New image selected - click Save to update</p>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}
          {success && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">{success}</div>}

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Account Type</Label>
              <p className="text-sm capitalize">{user?.role || "User"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
              <p className="text-sm">{user?.createdAt ? formatDate(user.createdAt) : "Unknown"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Your Uploads ({uploads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : uploads.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploads.map((upload) => (
                <div key={upload.id} className="space-y-2">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={upload.image_url || "/placeholder.svg"}
                      alt={upload.comment || "Upload"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    {upload.comment && <p className="text-sm text-muted-foreground line-clamp-2">{upload.comment}</p>}
                    <p className="text-xs text-muted-foreground">
                      {upload.created_at ? formatDate(upload.created_at) : "Unknown date"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No uploads yet</p>
              <p className="text-sm text-muted-foreground">Share your first memory to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
