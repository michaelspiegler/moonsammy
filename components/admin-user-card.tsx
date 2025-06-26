"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  User,
  Mail,
  Calendar,
  ImageIcon,
  MessageCircle,
  Edit,
  Trash2,
  Key,
  MoreVertical,
  Shield,
  Database,
} from "lucide-react"

interface UserType {
  id: string
  name: string
  email: string
  role?: string
  profileImage?: string
  createdAt: string
  updatedAt: string
  uploadCount: number
  commentCount: number
}

interface AdminUserCardProps {
  user: UserType
  onEdit: () => void
  onDelete: (userId: string) => void
}

export function AdminUserCard({ user, onEdit, onDelete }: AdminUserCardProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [deletingUploads, setDeletingUploads] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleEdit = () => {
    console.log("Edit clicked for user:", user.name)
    setShowDropdown(false)
    onEdit()
  }

  const handleDeleteUser = async () => {
    console.log("Delete user clicked for:", user.name)
    setShowDropdown(false)

    const keepPhotos = confirm(
      `Delete ${user.name}?\n\nClick OK to delete user but KEEP their photos\nClick Cancel to delete user AND all their photos`,
    )

    const confirmDelete = confirm(
      `Are you absolutely sure you want to delete ${user.name}?\n\n${
        keepPhotos
          ? "Their photos will be kept but marked as 'Anonymous User'"
          : "This will permanently delete their account AND all their photos"
      }\n\nThis action cannot be undone.`,
    )

    if (!confirmDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepPhotos }),
      })

      if (response.ok) {
        onDelete(user.id)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteUploads = async () => {
    console.log("Delete uploads clicked for:", user.name)
    setShowDropdown(false)

    if (
      !confirm(
        `Delete all uploads by ${user.name}?\n\nThis will permanently delete all ${user.uploadCount} photos they uploaded.\n\nThis action cannot be undone.`,
      )
    ) {
      return
    }

    setDeletingUploads(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/uploads`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert(`Successfully deleted all uploads by ${user.name}`)
        // Refresh the user data
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete uploads")
      }
    } catch (error) {
      console.error("Error deleting uploads:", error)
      alert("Failed to delete uploads")
    } finally {
      setDeletingUploads(false)
    }
  }

  const handleResetPassword = async () => {
    console.log("Reset password clicked for:", user.name)
    setShowDropdown(false)

    const newPassword = prompt(`Enter new password for ${user.name} (minimum 6 characters):`)
    if (!newPassword || newPassword.length < 6) {
      if (newPassword !== null) {
        alert("Password must be at least 6 characters")
      }
      return
    }

    setResettingPassword(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })

      if (response.ok) {
        alert(`Password reset successfully for ${user.name}. All their sessions have been invalidated.`)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to reset password")
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      alert("Failed to reset password")
    } finally {
      setResettingPassword(false)
    }
  }

  const toggleRole = async () => {
    console.log("Toggle role clicked for:", user.name)
    setShowDropdown(false)

    const newRole = user.role === "Admin" ? "Member" : "Admin"

    if (
      !confirm(
        `Change ${user.name}'s role from ${user.role} to ${newRole}?\n\n${
          newRole === "Admin"
            ? "They will gain access to admin settings and user management."
            : "They will lose admin access and only have member privileges."
        }`,
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: newRole,
        }),
      })

      if (response.ok) {
        alert(`Successfully changed ${user.name}'s role to ${newRole}`)
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to update role")
      }
    } catch (error) {
      console.error("Error updating role:", error)
      alert("Failed to update role")
    }
  }

  return (
    <Card className="overflow-visible hover:shadow-md transition-shadow relative">
      <CardContent className="p-4">
        {/* User Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {user.profileImage ? (
                <Image
                  src={user.profileImage || "/placeholder.svg"}
                  alt={user.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <User className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-800 truncate">{user.name}</h3>
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Mail className="h-3 w-3" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.role && (
                <div className={`text-xs font-medium mt-1 ${user.role === "Admin" ? "text-red-600" : "text-blue-600"}`}>
                  {user.role === "Admin" && <Shield className="inline h-3 w-3 mr-1" />}
                  {user.role}
                </div>
              )}
            </div>
          </div>

          {/* Custom Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
              onClick={() => {
                console.log("Dropdown trigger clicked for user:", user.name)
                setShowDropdown(!showDropdown)
              }}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>

            {/* Custom Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-8 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                <button
                  onClick={handleEdit}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                >
                  <Edit className="mr-3 h-4 w-4" />
                  Edit User Details
                </button>

                <button
                  onClick={toggleRole}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                >
                  <Shield className="mr-3 h-4 w-4" />
                  {user.role === "Admin" ? "Demote to Member" : "Promote to Admin"}
                </button>

                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center disabled:opacity-50"
                >
                  <Key className="mr-3 h-4 w-4" />
                  {resettingPassword ? "Resetting..." : "Reset Password"}
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={handleDeleteUploads}
                  disabled={deletingUploads || user.uploadCount === 0}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 text-orange-600 flex items-center disabled:opacity-50"
                >
                  <Database className="mr-3 h-4 w-4" />
                  {deletingUploads ? "Deleting..." : `Delete ${user.uploadCount} Uploads`}
                </button>

                <button
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center disabled:opacity-50"
                >
                  <Trash2 className="mr-3 h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete User Account"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
              <ImageIcon className="h-3 w-3" />
              <span>Uploads</span>
            </div>
            <p className="text-lg font-medium text-gray-800">{user.uploadCount}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="flex items-center justify-center space-x-1 text-sm text-gray-600 mb-1">
              <MessageCircle className="h-3 w-3" />
              <span>Comments</span>
            </div>
            <p className="text-lg font-medium text-gray-800">{user.commentCount}</p>
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Calendar className="h-3 w-3" />
            <span>Joined {formatDate(user.createdAt)}</span>
          </div>
          {user.updatedAt !== user.createdAt && (
            <div className="flex items-center space-x-2">
              <Edit className="h-3 w-3" />
              <span>Updated {formatDate(user.updatedAt)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
