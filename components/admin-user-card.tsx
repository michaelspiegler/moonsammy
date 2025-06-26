"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, Mail, Calendar, ImageIcon, MessageCircle, Edit, Trash2, Key, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

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
  const [deleting, setDeleting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleEdit = () => {
    console.log("Edit clicked for user:", user.name)
    setDropdownOpen(false)
    onEdit()
  }

  const handleDelete = async () => {
    console.log("Delete clicked for user:", user.name)
    setDropdownOpen(false)

    if (
      !confirm(
        `Are you sure you want to delete ${user.name}? This will also delete all their uploads, comments, and sessions. This action cannot be undone.`,
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
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

  const handleResetPassword = async () => {
    console.log("Reset password clicked for user:", user.name)
    setDropdownOpen(false)

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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow relative">
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
              {user.role && <div className="text-xs text-blue-600 font-medium mt-1">{user.role}</div>}
            </div>
          </div>

          {/* Actions Dropdown */}
          <div className="relative">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 relative z-10"
                  onClick={() => {
                    console.log("Dropdown trigger clicked for user:", user.name)
                    setDropdownOpen(!dropdownOpen)
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 z-50 bg-white border border-gray-200 shadow-lg"
                sideOffset={5}
              >
                <DropdownMenuItem
                  onClick={handleEdit}
                  className="cursor-pointer hover:bg-gray-100 flex items-center px-3 py-2"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="cursor-pointer hover:bg-gray-100 flex items-center px-3 py-2"
                >
                  <Key className="mr-2 h-4 w-4" />
                  {resettingPassword ? "Resetting..." : "Reset Password"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50 flex items-center px-3 py-2"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete User"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
