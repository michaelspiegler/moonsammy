"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, AlertCircle, Database, CheckCircle } from "lucide-react"

export function AdminLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok) {
        window.location.reload()
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="border border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2 text-gray-700 font-light">
            <Lock className="h-5 w-5" />
            <span>Admin Access</span>
          </CardTitle>
          <p className="text-gray-500 font-light">Brian Quain Memorial Gallery</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-light"
                required
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-light"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            {/* Database Status */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-700">Database Status</span>
              </div>
              <div className="flex items-center space-x-2">
                {process.env.DATABASE_URL ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 text-sm font-light">Neon database connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                    <span className="text-orange-600 text-sm font-light">Neon database not configured</span>
                  </>
                )}
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-gray-600 font-light">
              <p className="mb-2">
                <strong>Required Setup:</strong>
              </p>
              <ol className="space-y-1 text-xs">
                <li>1. Add Neon database integration</li>
                <li>2. Set ADMIN_PASSWORD environment variable</li>
                <li>3. Comments will be persistent in database</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
