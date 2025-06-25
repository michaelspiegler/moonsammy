"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Trash2, MessageCircle, User, AlertTriangle, Calendar, FileText } from "lucide-react"

interface AdminLog {
  id: string
  action: string
  target_type: string
  target_id: string
  details: any
  created_at: string
}

interface AdminLogsResponse {
  logs: AdminLog[]
  pagination: {
    currentPage: number
    totalPages: number
    totalLogs: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalLogs: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [actionFilter, setActionFilter] = useState<string>("")

  useEffect(() => {
    fetchLogs()
  }, [currentPage, actionFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      })

      if (actionFilter) {
        params.append("action", actionFilter)
      }

      const response = await fetch(`/api/admin/logs?${params}`)
      const data: AdminLogsResponse = await response.json()

      if (response.ok) {
        setLogs(data.logs)
        setPagination(data.pagination)
        setError(null)
      } else {
        setError("Failed to fetch logs")
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      setError("Failed to fetch logs")
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "DELETE_PHOTO":
        return <Trash2 className="h-4 w-4" />
      case "DELETE_COMMENT":
        return <MessageCircle className="h-4 w-4" />
      case "DELETE_USER":
        return <User className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "DELETE_PHOTO":
      case "DELETE_COMMENT":
      case "DELETE_USER":
        return "destructive"
      case "DELETE_PHOTO_BLOB_FAILED":
        return "secondary"
      default:
        return "default"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderLogDetails = (log: AdminLog) => {
    const details = log.details || {}

    switch (log.action) {
      case "DELETE_PHOTO":
        return (
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Title:</strong> {details.title || "Untitled"}
            </p>
            <p>
              <strong>Filename:</strong> {details.filename}
            </p>
            <p>
              <strong>Uploader:</strong> {details.uploader || "Unknown"}
            </p>
            {details.year && (
              <p>
                <strong>Year:</strong> {details.year}
              </p>
            )}
            {details.tags && details.tags.length > 0 && (
              <p>
                <strong>Tags:</strong> {details.tags.join(", ")}
              </p>
            )}
            <p>
              <strong>Comments deleted:</strong> {details.comments_deleted || 0}
            </p>
            <p>
              <strong>Likes deleted:</strong> {details.likes_deleted || 0}
            </p>
            <p>
              <strong>Tags deleted:</strong> {details.tags_deleted?.length || 0}
            </p>
          </div>
        )
      case "DELETE_PHOTO_BLOB_FAILED":
        return (
          <div className="text-sm text-red-600">
            <p>
              <strong>Error:</strong> {details.error}
            </p>
            <p>
              <strong>Blob URL:</strong> {details.blob_url}
            </p>
          </div>
        )
      default:
        return (
          <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        )
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
        <p className="mt-2 text-gray-500 font-light">Loading admin logs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-gray-700">Admin Activity Logs</h2>
          <p className="text-gray-500 font-light">Track all administrative actions</p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Actions</option>
            <option value="DELETE_PHOTO">Photo Deletions</option>
            <option value="DELETE_COMMENT">Comment Deletions</option>
            <option value="DELETE_USER">User Deletions</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Logs</p>
                <p className="text-2xl font-light">{pagination.totalLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 font-light">No admin logs found</p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getActionIcon(log.action)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getActionColor(log.action) as any}>{log.action.replace(/_/g, " ")}</Badge>
                        <span className="text-sm text-gray-500">
                          {log.target_type}: {log.target_id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(log.created_at)}
                  </div>
                </div>

                {renderLogDetails(log)}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-gray-600 font-light">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!pagination.hasNextPage}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
