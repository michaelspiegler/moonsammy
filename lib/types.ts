export interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  profileImageUrl?: string
  sessionToken?: string
}

export interface Photo {
  id: string
  url: string
  description: string
  author: string
  user_id: string
  created_at: string
  tags: string[]
  year?: number
  profile_image_url?: string
}
