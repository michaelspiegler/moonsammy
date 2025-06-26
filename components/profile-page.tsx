"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, User, Save, Loader2 } from "lucide-react"

interface ProfilePageProps {
  user: any
  onUserUpdate: (user: any) => void
}

export function ProfilePage({ user, onUserUpdate }: ProfilePageProps) {
  const [name, setName] = useState(user?.name || "")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || "")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploads, setUploads] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setProfileImageUrl(user.profileImageUrl || "")
      fetchUploads()
    }
  }, [user])

  const fetchUploads = async () => {
    try {
      setLoading(true)
      const sessionToken =
        localStorage.getItem("sessionToken") ||
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("sessionToken="))
          ?.split("=")[1]

      if (!sessionToken) {
        setError("No session token found")
        return
      }

      const response = await fetch("/api/profile/uploads", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          Cookie: `sessionToken=${sessionToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUploads(data.uploads || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to fetch uploads")
      }
    } catch (error) {
      console.error("Error fetching uploads:", error)
      setError("Failed to fetch uploads")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setProfileImage(file)
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setProfileImageUrl(previewUrl)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const sessionToken =
        localStorage.getItem("sessionToken") ||
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("sessionToken="))
          ?.split("=")[1]

      if (!sessionToken) {
        setError("No session token found. Please log in again.")
        return
      }

      let imageUrl = profileImageUrl

      // Upload image if a new one was selected
      if (profileImage) {
        const formData = new FormData()
        formData.append("file", profileImage)
        formData.append("type", "profile")

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            Cookie: `sessionToken=${sessionToken}`,
          },
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          imageUrl = uploadData.url
        } else {
          const uploadError = await uploadResponse.json()
          throw new Error(uploadError.error || "Failed to upload image")
        }
      }

      // Update profile
      const updateResponse = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
          Cookie: `sessionToken=${sessionToken}`,
        },
        body: JSON.stringify({
          name,
          profileImageUrl: imageUrl,
        }),
      })

      if (updateResponse.ok) {
        const updatedUser = await updateResponse.json()
        setSuccess("Profile updated successfully!")
        setProfileImage(null)
        onUserUpdate(updatedUser.user)

        // Update localStorage with new user data
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
        const newUser = { ...currentUser, ...updatedUser.user }
        localStorage.setItem("user", JSON.stringify(newUser))
      } else {
        const updateError = await updateResponse.json()
        throw new Error(updateError.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      setError(error instanceof Error ? error.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid gap-6 md:grid-cols-2">
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
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileImageUrl || "/placeholder.svg"} alt={name} />
                <AvatarFallback className="text-lg">{name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-center space-y-2">
                <Label htmlFor="profile-image" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    <Upload className="h-4 w-4" />
                    Change Photo
                  </div>
                </Label>
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {profileImage && <p className="text-sm text-gray-600">New image selected: {profileImage.name}</p>}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled className="bg-gray-50" />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
            <CardTitle>Your Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading uploads...</span>
              </div>
            ) : uploads.length > 0 ? (
              <div className="grid gap-4">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={upload.url || "/placeholder.svg"}
                      alt={upload.caption || "Upload"}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.caption || "Untitled"}</p>
                      <p className="text-xs text-gray-500">{new Date(upload.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No uploads yet</p>
                <p className="text-sm">Share your first memory to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
