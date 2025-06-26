"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLoginView, setIsLoginView] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const url = isLoginView ? "/api/auth/login" : "/api/auth/register"
    const body = isLoginView ? { email, password } : { email, password, name }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      toast({
        title: "Success",
        description: isLoginView ? "Logged in successfully." : "Account created successfully.",
      })
      onSuccess()
      onClose()
      // Refresh the page to update session state
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background text-foreground memorial:bg-black memorial:text-gold-50 memorial:border-gold-700">
        <DialogHeader>
          <DialogTitle>{isLoginView ? "Sign In" : "Create Account"}</DialogTitle>
          <DialogDescription>
            {isLoginView ? "Sign in to continue." : "Create an account to share your memories."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAuth}>
          <div className="grid gap-4 py-4">
            {!isLoginView && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsLoginView(!isLoginView)}
              className="text-sm memorial:text-gold-200 hover:memorial:text-gold-50"
            >
              {isLoginView ? "Need an account?" : "Already have an account?"}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="memorial:bg-transparent memorial:border memorial:border-gold-500 memorial:text-gold-500 hover:memorial:bg-gold-500 hover:memorial:text-black"
            >
              {isLoading ? "Processing..." : isLoginView ? "Sign In" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
