"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut, UserPlus } from "lucide-react"
import Link from "next/link"
import { AuthModal } from "./auth-modal"

interface HeaderNavProps {
  user: any
  onLogout: () => void
  onAuthClick?: () => void
  showAsButton?: boolean
}

export function HeaderNav({ user, onLogout, onAuthClick, showAsButton = false }: HeaderNavProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleAuthSuccess = (userData: any) => {
    setShowAuthModal(false)
    window.location.reload()
  }

  if (!user) {
    if (showAsButton) {
      return (
        <>
          <Button
            onClick={() => setShowAuthModal(true)}
            className="bg-amber-600/20 text-amber-900 border-amber-600/30 hover:bg-amber-600/30 hover:border-amber-600/50 font-serif"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account / Sign In
          </Button>

          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
        </>
      )
    }

    return (
      <>
        <Button
          variant="ghost"
          onClick={() => setShowAuthModal(true)}
          className="text-gray-700 hover:text-gray-900 font-serif"
        >
          Sign In
        </Button>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-serif">
          <User className="h-4 w-4" />
          <span>{user.name || user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dropdown-menu-content">
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Profile
          </Link>
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="flex items-center text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
