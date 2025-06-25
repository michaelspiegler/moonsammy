"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, UserPlus, Search, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from "lucide-react"
import { AdminUserCard } from "./admin-user-card"
import { AdminUserForm } from "./admin-user-form"

interface UserType {
  id: string
  name: string
  email: string
  profileImage?: string
  createdAt: string
  updatedAt: string
  uploadCount: number
  commentCount: number
}

interface UsersResponse {
  users: UserType[]
  totalUsers: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  error?: string
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchQuery])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      })

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }

      const response = await fetch(`/api/admin/users?${params}`)
      const data: UsersResponse = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setUsers(data.users)
        setTotalUsers(data.totalUsers)
        setTotalPages(data.totalPages)
        setHasNextPage(data.hasNextPage)
        setHasPrevPage(data.hasPrevPage)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleUserCreated = (newUser: UserType) => {
    setUsers([newUser, ...users])
    setTotalUsers(totalUsers + 1)
    setShowAddUser(false)
  }

  const handleUserUpdated = (updatedUser: UserType) => {
    setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
    setEditingUser(null)
  }

  const handleUserDeleted = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
    setTotalUsers(totalUsers - 1)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const showPages = 5

    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
    const endPage = Math.min(totalPages, startPage + showPages - 1)

    if (endPage - startPage + 1 < showPages) {
      startPage = Math.max(1, endPage - showPages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <Button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          variant="outline"
          size="sm"
          className="font-light"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {startPage > 1 && (
          <>
            <Button onClick={() => handlePageChange(1)} variant="outline" size="sm" className="font-light">
              1
            </Button>
            {startPage > 2 && <span className="text-gray-400">...</span>}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            onClick={() => handlePageChange(page)}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            className={`font-light ${
              page === currentPage ? "bg-gray-800 text-white" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
            <Button onClick={() => handlePageChange(totalPages)} variant="outline" size="sm" className="font-light">
              {totalPages}
            </Button>
          </>
        )}

        <Button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNextPage}
          variant="outline"
          size="sm"
          className="font-light"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-gray-700 flex items-center space-x-2">
            <Users className="h-6 w-6" />
            <span>User Management</span>
          </h2>
          <p className="text-gray-500 font-light">
            {totalUsers} total users • Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchUsers} variant="ghost" size="sm" className="font-light">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowAddUser(true)} className="bg-gray-800 hover:bg-gray-700 text-white font-light">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 font-light"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-600 font-medium">Error Loading Users</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm" className="flex-shrink-0">
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
          <p className="mt-4 text-gray-500 font-light">Loading users...</p>
        </div>
      )}

      {/* Users List */}
      {!loading && users.length === 0 && !error ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-light">
              {searchQuery ? "No users found matching your search" : "No users registered yet"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddUser(true)} className="mt-4" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add First User
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        !loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <AdminUserCard
                  key={user.id}
                  user={user}
                  onEdit={() => setEditingUser(user)}
                  onDelete={handleUserDeleted}
                />
              ))}
            </div>
            {renderPagination()}
          </>
        )
      )}

      {/* Add User Modal */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Add New User</span>
            </DialogTitle>
          </DialogHeader>
          <AdminUserForm onSuccess={handleUserCreated} onCancel={() => setShowAddUser(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Edit User</span>
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <AdminUserForm user={editingUser} onSuccess={handleUserUpdated} onCancel={() => setEditingUser(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
