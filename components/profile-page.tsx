"use client"
import { ThemeSelector } from "./theme-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Palette, Upload, User } from "lucide-react"
import { useState } from "react"

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<"profile" | "uploads" | "themes">("profile")
  const uploads: any[] = [] // Replace 'any[]' with the actual type of 'uploads' if known

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-md font-light transition-colors ${
            activeTab === "profile" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <User className="h-4 w-4 inline mr-2" />
          Profile/Settings
        </button>
        <button
          onClick={() => setActiveTab("uploads")}
          className={`px-4 py-2 rounded-md font-light transition-colors ${
            activeTab === "uploads" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Upload className="h-4 w-4 inline mr-2" />
          My Uploads ({uploads.length})
        </button>
        <button
          onClick={() => setActiveTab("themes")}
          className={`px-4 py-2 rounded-md font-light transition-colors ${
            activeTab === "themes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Palette className="h-4 w-4 inline mr-2" />
          Themes
        </button>
      </div>

      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{/* All existing profile form content */}</CardContent>
        </Card>
      )}

      {activeTab === "uploads" && (
        <Card>
          <CardHeader>
            <CardTitle>My Uploads</CardTitle>
            <CardDescription>Manage your uploaded content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{/* All existing uploads content */}</CardContent>
        </Card>
      )}

      {activeTab === "themes" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-700 font-light">
              <Palette className="h-5 w-5" />
              <span>App Themes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ProfilePage
