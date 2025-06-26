export interface User {
  id: number
  name: string
  email: string
  role?: string
  profileImageUrl?: string
  sessionToken?: string
}

export interface Photo {
  id: number
  url: string
  caption?: string
  uploadedBy: string
  uploadedAt: string
  tags?: string[]
  year?: number
}
