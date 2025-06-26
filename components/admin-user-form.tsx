"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LucideUser, Mail, Lock, Save, X, Shield } from "lucide-react"

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

interface AdminUserFormProps {
  user?: UserType // If provided, we're editing; if not, we're creating
  onSuccess: (user: UserType) => void
  onCancel: () => void
}

export function AdminUserForm({ user, onSuccess, onCancel }: AdminUserFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    role: user?.role || "Member",
  })

  const isEditing = !!user

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = isEditing ? `/api/admin/users/${user.id}` : "/api/admin/users"
      const method = isEditing ? "PUT" : "POST"

      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      }

      // Only include password if it's provided
      if (formData.password.trim()) {
        body.password = formData.password
      } else if (!isEditing) {
        // Password is required for new users
        setError("Password is required for new users")
        setLoading(false)
        return
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (isEditing) {
          // For editing, we need to fetch the updated user data
          const userResponse = await fetch(`/api/admin/users/${user.id}`)
          const userData = await userResponse.json()
          if (userData.user) {
            onSuccess(userData.user)
          }
        } else {
          // For creating, the user data is returned
          onSuccess(data.user)
        }
      } else {
        setError(data.error || `Failed to ${isEditing ? "update" : "create"} user`)
      }
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "creating"} user:`, error)
      setError(`Failed to ${isEditing ? "update" : "create"} user`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
          <LucideUser className="h-4 w-4" />
          <span>Name</span>
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Full name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 font-light"
          required
          minLength={2}
        />
      </div>

      <div>
        <Label htmlFor="email" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 font-light"
          required
        />
      </div>

      <div>
        <Label htmlFor="role" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
          <Shield className="h-4 w-4" />
          <span>Role</span>
        </Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Member">Member</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          {formData.role === "Admin" ? "Can access admin settings and manage users" : "Standard user access"}
        </p>
      </div>

      <div>
        <Label htmlFor="password" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
          <Lock className="h-4 w-4" />
          <span>Password</span>
        </Label>
        <Input
          id="password"
          type="password"
          placeholder={isEditing ? "Leave blank to keep current password" : "Minimum 6 characters"}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mt-1 font-light"
          minLength={6}
          required={!isEditing}
        />
        {isEditing && <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password</p>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 p-3 rounded text-red-600 text-sm">{error}</div>}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" onClick={onCancel} variant="outline" className="font-light">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-gray-800 hover:bg-gray-700 text-white font-light">
          <Save className="h-4 w-4 mr-2" />
          {loading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  )
}
