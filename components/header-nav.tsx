"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { User, Settings, Shield, LogOut } from "lucide-react"

interface HeaderNavProps {
  user: any
  onLogout: () => void
  onLoginClick: () => void
}

export function HeaderNav({ user, onLogout, onLoginClick }: HeaderNavProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      onLogout()
      setShowDropdown(false)
      router.push("/") // Navigate to home on logout
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4 text-sm">
        <a href="/faq" className="text-foreground hover:text-primary transition-colors">
          FAQ
        </a>
      </div>

      {user ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-foreground text-sm">{user.name}</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-50">
              <div className="py-1">
                <div className="px-4 py-2 text-xs text-muted-foreground border-b">{user.role || "Member"}</div>

                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push("/profile")
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Profile/Settings
                </button>

                {user.role === "Admin" && (
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      router.push("/admin")
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Settings
                  </button>
                )}

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted flex items-center gap-2"
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
          onClick={onLoginClick}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
        >
          <User className="w-4 h-4 inline mr-2" />
          Sign In
        </button>
      )}
    </div>
  )
}
