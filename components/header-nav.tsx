"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthModal } from "./auth-modal"
import { User, Settings, Shield, LogOut } from "lucide-react"

interface HeaderNavProps {
  user: any
  onAuthChange: (user: any) => void
  onSuccess?: (user: any) => void
  showButtonOnly?: boolean
}

export function HeaderNav({ user, onAuthChange, onSuccess, showButtonOnly = false }: HeaderNavProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [showDropdown])

  const handleAuthSuccess = (userData: any) => {
    console.log("🔍 HeaderNav: Auth success:", userData?.name || "null")
    setShowAuthModal(false)
    onAuthChange(userData)
    if (onSuccess) {
      onSuccess(userData)
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      localStorage.removeItem("sessionToken")
      onAuthChange(null)
      setShowDropdown(false)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const handleAdminSettings = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    console.log("🔍 HeaderNav: Admin settings clicked")

    if (user && user.role === "Admin") {
      // Manually set cookies before navigation
      if (user.sessionToken) {
        document.cookie = `session=${user.sessionToken}; path=/; SameSite=Lax`
        document.cookie = `auth-session=${user.sessionToken}; path=/; SameSite=Lax`
        document.cookie = `user-session=${user.sessionToken}; path=/; SameSite=Lax`
      }

      setShowDropdown(false)

      setTimeout(() => {
        router.push("/admin")
      }, 100)
    }
  }

  // If showButtonOnly is true, render just the auth button
  if (showButtonOnly) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-6 py-2 bg-[#D4AF37] text-[#222222] font-medium rounded-md hover:bg-[#B8941F] transition-colors"
        >
          Create Account / Sign In
        </button>

        {showAuthModal && (
          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
        )}
      </>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {/* FAQ and Sign in required links */}
      <div className="flex items-center gap-4 text-sm">
        <a href="/faq" className="text-[#D4AF37] hover:text-[#B8941F] transition-colors">
          FAQ
        </a>
        {!user && <span className="text-[#D4AF37]">Sign in required</span>}
      </div>

      {user ? (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDropdown(!showDropdown)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#333333] transition-colors"
          >
            <div className="w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-[#222222]" />
            </div>
            <span className="text-[#D4AF37] text-sm">{user.name}</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-[#222222] border border-[#333333] rounded-md shadow-lg z-[999999]">
              <div className="py-1">
                <div className="px-4 py-2 text-xs text-gray-400 border-b border-[#333333]">{user.role || "Member"}</div>

                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push("/profile")
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#D4AF37] hover:bg-[#333333] flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Profile/Settings
                </button>

                {user.role === "Admin" && (
                  <button
                    onClick={handleAdminSettings}
                    className="w-full text-left px-4 py-2 text-sm text-[#D4AF37] hover:bg-[#333333] flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Settings
                  </button>
                )}

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#333333] flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-[#D4AF37] text-[#222222] font-medium rounded-md hover:bg-[#B8941F] transition-colors"
        >
          <User className="w-4 h-4 inline mr-2" />
          Sign In
        </button>
      )}

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  )
}
