"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { User, LogOut, Settings, UserPlus, ChevronDown, Shield } from "lucide-react"
import { AuthModal } from "./auth-modal"
import Link from "next/link"

interface UserType {
  id: string
  name: string
  email: string
  role?: string
  profileImage?: string
}

interface HeaderNavProps {
  user?: UserType | null
  onAuthChange?: (user: UserType | null) => void
  onSuccess?: (user: UserType | null) => void
  showButtonOnly?: boolean
}

export function HeaderNav({ user: propUser, onAuthChange, onSuccess, showButtonOnly = false }: HeaderNavProps) {
  const [user, setUser] = useState<UserType | null>(propUser || null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [imageError, setImageError] = useState(false)
  const router = useRouter()

  // Update local user when prop changes
  useEffect(() => {
    console.log("Header: prop user changed to:", propUser)
    setUser(propUser || null)
    setImageError(false)
  }, [propUser])

  useEffect(() => {
    if (!propUser && !showButtonOnly) {
      checkAuthStatus()
    } else {
      setLoading(false)
    }
  }, [propUser, showButtonOnly])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      })
      const data = await response.json()
      console.log("Header auth check result:", data)
      if (data.user) {
        setUser(data.user)
        onAuthChange?.(data.user)
      } else {
        setUser(null)
        onAuthChange?.(null)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      setUser(null)
      onAuthChange?.(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      setUser(null)
      onAuthChange?.(null)
      setShowDropdown(false)
      window.location.href = "/"
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleProfile = () => {
    console.log("🔍 Profile button clicked")
    setShowDropdown(false)

    const currentUser = user || propUser
    console.log("🔍 Current user for profile navigation:", currentUser)

    if (currentUser) {
      console.log("🔍 User exists, navigating to profile...")
      try {
        router.push("/profile")
        console.log("🔍 Router.push called successfully")
      } catch (error) {
        console.error("🔍 Router.push failed:", error)
      }
    } else {
      console.log("🔍 No user found, showing alert")
      alert("Please sign in to access your profile")
    }
  }

  const handleAdminSettings = () => {
    console.log("🔍 Admin Settings clicked")
    setShowDropdown(false)
    router.push("/admin")
  }

  const handleAuthSuccess = async (userData: UserType) => {
    console.log("Header auth success:", userData)
    setUser(userData)
    onAuthChange?.(userData)
    onSuccess?.(userData)
    setShowAuthModal(false)
    setImageError(false)
    console.log("Header auth completed, user set to:", userData)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  // If showButtonOnly is true, just render the sign-in button
  if (showButtonOnly) {
    return (
      <>
        <Button onClick={() => setShowAuthModal(true)} className="memorial-button px-8 py-3">
          <UserPlus className="h-4 w-4 mr-2" />
          Create Account / Sign In
        </Button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      </>
    )
  }

  if (loading && !propUser) {
    return (
      <div className="flex items-center justify-end">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    )
  }

  const currentUser = user || propUser
  const isAdmin = currentUser?.role === "Admin"

  return (
    <div className="flex items-center justify-end">
      <Link href="/faq" className="text-gray-600 hover:text-gray-900 font-medium transition-colors mr-4">
        FAQ
      </Link>
      {currentUser ? (
        <div className="relative">
          <Button
            variant="ghost"
            className="relative h-10 rounded-full p-1 hover:bg-gray-100"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
                {currentUser.profileImage && !imageError ? (
                  <Image
                    src={currentUser.profileImage || "/placeholder.svg"}
                    alt={currentUser.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover w-full h-full"
                    onError={handleImageError}
                    unoptimized
                  />
                ) : (
                  <User className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <ChevronDown className="h-3 w-3 text-gray-500" />
            </div>
          </Button>

          {/* Custom Dropdown */}
          {showDropdown && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                <div className="p-3 border-b border-gray-100">
                  <p className="font-medium text-gray-800">{currentUser.name}</p>
                  <p className="text-sm text-gray-500 truncate">{currentUser.email}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">{currentUser.role || "Member"}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleProfile}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Profile/Settings
                  </button>

                  {/* Show Admin Settings only for Admin users */}
                  {isAdmin && (
                    <button
                      onClick={handleAdminSettings}
                      className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-gray-100 transition-colors"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Settings
                    </button>
                  )}

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 font-light">Sign in required</span>
          <Button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-light"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
