"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/auth-modal"

interface HeaderNavProps {
  user: any
  onAuthChange: (user: any) => void
  showButtonOnly?: boolean
}

export function HeaderNav({ user, onAuthChange, showButtonOnly = false }: HeaderNavProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (showButtonOnly) {
    return (
      <div className="flex items-center gap-4">
        {!user && (
          <Button onClick={() => setShowAuthModal(true)} className="memorial-button">
            Create Account / Sign In
          </Button>
        )}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthChange={onAuthChange} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {!user && (
        <Button onClick={() => setShowAuthModal(true)} className="memorial-button">
          Create Account / Sign In
        </Button>
      )}
      {user && (
        <Button onClick={() => onAuthChange(null)} className="memorial-button">
          Sign Out
        </Button>
      )}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthChange={onAuthChange} />
    </div>
  )
}
