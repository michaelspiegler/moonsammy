"use client"

import { useTheme } from "./theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Palette, Moon, Music, Zap } from "lucide-react"

const themes = [
  {
    id: "default" as const,
    name: "Default",
    description: "Clean and modern light theme",
    icon: Palette,
    preview: "bg-white border-gray-200",
  },
  {
    id: "memorial" as const,
    name: "Memorial",
    description: "Elegant dark theme with gold accents",
    icon: Moon,
    preview: "bg-gray-900 border-yellow-600",
  },
  {
    id: "indie90s" as const,
    name: "90s Indie",
    description: "Nostalgic grunge-inspired aesthetic",
    icon: Music,
    preview: "bg-amber-50 border-orange-400",
  },
  {
    id: "punk" as const,
    name: "Punk Rock",
    description: "Bold and rebellious design",
    icon: Zap,
    preview: "bg-black border-red-500",
  },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Selection
        </CardTitle>
        <CardDescription>Choose a theme that reflects your style and mood</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon
            const isSelected = theme === themeOption.id

            return (
              <Button
                key={themeOption.id}
                variant={isSelected ? "default" : "outline"}
                className={`h-auto p-4 flex flex-col items-start gap-2 ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                onClick={() => setTheme(themeOption.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{themeOption.name}</span>
                </div>
                <div className={`w-full h-8 rounded border-2 ${themeOption.preview}`} />
                <p className="text-sm text-left opacity-70">{themeOption.description}</p>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
