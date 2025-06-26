"use client"
import { useState } from "react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any) => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("🔍 Auth Modal: Login successful, data:", data)

        if (data.sessionToken) {
          localStorage.setItem("sessionToken", data.sessionToken)
        }

        onSuccess({
          ...data.user,
          sessionToken: data.sessionToken,
        })

        setError("")
        setLoading(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Login failed")
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || "Login failed")
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("🔍 Auth Modal: Registration successful, data:", data)

        if (data.sessionToken) {
          localStorage.setItem("sessionToken", data.sessionToken)
        }

        onSuccess({
          ...data.user,
          sessionToken: data.sessionToken,
        })

        setError("")
        setLoading(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Registration failed")
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || "Registration failed")
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (mode === "login") {
      handleLogin()
    } else {
      handleRegister()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-container">
        <div className="text-center">
          {/* Tab Headers */}
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

          <h3 className="text-xl font-light text-[#D4AF37] mb-6 font-serif">
            {mode === "login" ? "Welcome Back" : "Join the Memorial"}
          </h3>

          <div className="space-y-4">
            {mode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              type="email"
              placeholder="Email Address"
              className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {mode === "register" && (
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full py-3 px-4 bg-[#333333] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}

            {error && <p className="text-red-400 text-sm font-light">{error}</p>}
          </div>

          <div className="mt-6 space-y-3">
            <button
              className="w-full py-3 px-4 bg-[#D4AF37] text-[#222222] font-medium rounded-md hover:bg-[#B8941F] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#222222] transition-colors disabled:opacity-50"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? mode === "login"
                  ? "Signing In..."
                  : "Creating Account..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>

            <button
              className="w-full py-3 px-4 bg-transparent border border-[#444444] text-[#D4AF37] font-medium rounded-md hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#222222] transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
