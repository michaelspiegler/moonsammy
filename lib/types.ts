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

export interface Comment {
  id: number
  photoId: number
  userId: number
  content: string
  createdAt: string
  user: {
    name: string
    profileImageUrl?: string
  }
}
