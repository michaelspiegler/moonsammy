"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { User, Mail, Lock, UserPlus, LogIn } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any) => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const body = mode === "login" ? { email: formData.email, password: formData.password } : formData

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log("Auth modal success:", data.user)

        // Store session token in localStorage as backup
        if (data.sessionToken) {
          localStorage.setItem("sessionToken", data.sessionToken)
          console.log("🔍 Stored session token in localStorage:", data.sessionToken)
        }

        // Also manually set cookie as backup
        if (data.sessionToken) {
          document.cookie = `session=${data.sessionToken}; path=/; max-age=${30 * 24 * 60 * 60}`
          document.cookie = `auth-session=${data.sessionToken}; path=/; max-age=${30 * 24 * 60 * 60}`
          console.log("🔍 Manually set cookies via document.cookie")
        }

        onSuccess(data.user)
        onClose()
        setFormData({ name: "", email: "", password: "" })

        setTimeout(() => {
          console.log("Auth modal: state should be propagated now")
        }, 100)
      } else {
        setError(data.error || `${mode === "login" ? "Login" : "Registration"} failed`)
      }
    } catch (error) {
      console.error(`${mode} error:`, error)
      setError(`${mode === "login" ? "Login" : "Registration"} failed`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "" })
    setError("")
  }

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login")
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border border-gray-200 shadow-lg">
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center space-x-2 text-gray-700 font-light text-xl">
              {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
            </CardTitle>
            <p className="text-gray-500 font-light text-sm">
              {mode === "login"
                ? "Sign in to your account to interact with memories"
                : "Create an account to save your profile and interact with memories"}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="font-light border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    required
                    minLength={2}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="font-light border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="font-light border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  required
                  minLength={mode === "register" ? 6 : 1}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded text-red-600 text-sm font-light">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-light py-2.5"
              >
                {loading
                  ? mode === "login"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm font-light">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </p>
              <Button
                onClick={switchMode}
                variant="ghost"
                className="font-light text-blue-600 hover:text-blue-700 mt-1"
              >
                {mode === "login" ? "Create Account" : "Sign In"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
