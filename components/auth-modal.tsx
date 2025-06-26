"use client"
import { useState } from "react"
import type React from "react"
import type { User } from "@/lib/types"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: User) => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    setError("")

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register"
    const body = mode === "login" ? { email, password } : { name, email, password }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "An unknown error occurred.")
      }

      if (data.user) {
        onSuccess(data.user)
      } else {
        throw new Error("Login successful, but no user data was returned.")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="flex mb-6 bg-[#333333] rounded-lg p-1">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "login" ? "bg-[#D4AF37] text-[#222222]" : "text-[#D4AF37] hover:bg-[#444444]"
            }`}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "register" ? "bg-[#D4AF37] text-[#222222]" : "text-[#D4AF37] hover:bg-[#444444]"
            }`}
            onClick={() => setMode("register")}
          >
            Create Account
          </button>
        </div>

        <h3 className="text-xl font-light text-center text-[#D4AF37] mb-6 font-serif">
          {mode === "login" ? "Welcome Back" : "Join the Memorial"}
        </h3>

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === "register" && (
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}
          {error && <p className="text-red-400 text-sm text-center font-light">{error}</p>}
          <div className="mt-6 space-y-3">
            <button type="submit" className="w-full btn" disabled={loading}>
              {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
            <button type="button" className="w-full btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
