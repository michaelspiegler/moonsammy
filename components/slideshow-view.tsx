"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings,
  X,
  Maximize,
  Minimize,
  Shuffle,
  RotateCcw,
  Volume2,
  Eye,
  EyeOff,
  Timer,
  Zap,
} from "lucide-react"

interface Photo {
  id: string
  url: string
  filename: string
  uploadedAt: string
  title?: string
  year?: number
  uploaderName?: string
  comments?: any[]
  tags?: any[]
}

interface SlideshowSettings {
  duration: number // seconds
  transition: "fade" | "slide" | "zoom" | "blur" | "flip" | "kenburns"
  shuffle: boolean
  showMetadata: boolean
  autoStart: boolean
  pauseOnHover: boolean
  showProgress: boolean
  backgroundBlur: boolean
  transitionSpeed: number // milliseconds
}

interface SlideshowViewProps {
  photos: Photo[]
}

export function SlideshowView({ photos }: SlideshowViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [shuffledPhotos, setShuffledPhotos] = useState<Photo[]>(photos)
  const [settings, setSettings] = useState<SlideshowSettings>({
    duration: 5,
    transition: "fade",
    shuffle: false,
    showMetadata: true,
    autoStart: false,
    pauseOnHover: true,
    showProgress: true,
    backgroundBlur: true,
    transitionSpeed: 800,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Shuffle photos when shuffle setting changes
  useEffect(() => {
    if (settings.shuffle) {
      const shuffled = [...photos].sort(() => Math.random() - 0.5)
      setShuffledPhotos(shuffled)
      setCurrentIndex(0)
    } else {
      setShuffledPhotos(photos)
      setCurrentIndex(0)
    }
  }, [settings.shuffle, photos])

  // Auto-start slideshow
  useEffect(() => {
    if (settings.autoStart && shuffledPhotos.length > 0) {
      setIsPlaying(true)
    }
  }, [settings.autoStart, shuffledPhotos.length])

  // Progress tracking
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null

    if (isPlaying && settings.showProgress) {
      setProgress(0)
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          const increment = 100 / (settings.duration * 10)
          return prev >= 100 ? 0 : prev + increment
        })
      }, 100)
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval)
    }
  }, [isPlaying, currentIndex, settings.duration, settings.showProgress])

  // Slideshow timer
  useEffect(() => {
    if (isPlaying && shuffledPhotos.length > 1) {
      intervalRef.current = setInterval(() => {
        nextPhoto()
      }, settings.duration * 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, settings.duration, currentIndex, shuffledPhotos.length])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowLeft":
          e.preventDefault()
          prevPhoto()
          break
        case "ArrowRight":
          e.preventDefault()
          nextPhoto()
          break
        case "Escape":
          if (isFullscreen) {
            exitFullscreen()
          }
          break
        case "f":
        case "F":
          toggleFullscreen()
          break
        case "s":
        case "S":
          setShowSettings(!showSettings)
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isFullscreen, showSettings])

  // Fullscreen API
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error("Fullscreen error:", error)
    }
  }, [isFullscreen])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      setIsFullscreen(false)
    } catch (error) {
      console.error("Exit fullscreen error:", error)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      setProgress(0)
    }
  }

  const nextPhoto = useCallback(() => {
    if (shuffledPhotos.length === 0) return

    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % shuffledPhotos.length)
      setProgress(0)
      setIsTransitioning(false)
    }, settings.transitionSpeed / 2)
  }, [shuffledPhotos.length, settings.transitionSpeed])

  const prevPhoto = useCallback(() => {
    if (shuffledPhotos.length === 0) return

    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + shuffledPhotos.length) % shuffledPhotos.length)
      setProgress(0)
      setIsTransitioning(false)
    }, settings.transitionSpeed / 2)
  }, [shuffledPhotos.length, settings.transitionSpeed])

  const updateSetting = <K extends keyof SlideshowSettings>(key: K, value: SlideshowSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (shuffledPhotos.length === 0) {
    return (
      <div className="text-center py-20">
        <Play className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p className="text-2xl font-light text-gray-700 mb-2">no photos for slideshow</p>
        <p className="text-gray-500 font-light">add some photos to start the slideshow</p>
      </div>
    )
  }

  const currentPhoto = shuffledPhotos[currentIndex]
  const transitionClass = {
    fade: isTransitioning ? "opacity-0" : "opacity-100",
    slide: isTransitioning ? "transform translate-x-full" : "transform translate-x-0",
    zoom: isTransitioning ? "transform scale-110 opacity-0" : "transform scale-100 opacity-100",
    blur: isTransitioning ? "blur-sm opacity-0" : "blur-0 opacity-100",
    flip: isTransitioning ? "transform rotateY-180 opacity-0" : "transform rotateY-0 opacity-100",
    kenburns: "transform scale-105 animate-pulse",
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isFullscreen ? "fixed inset-0 z-50 bg-black" : "bg-gray-900 rounded-lg overflow-hidden"
      } ${isFullscreen ? "h-screen" : "h-[70vh]"}`}
      onMouseEnter={() => settings.pauseOnHover && isPlaying && setIsPlaying(false)}
      onMouseLeave={() => settings.pauseOnHover && setIsPlaying(true)}
    >
      {/* Background Image with Blur */}
      {settings.backgroundBlur && (
        <div className="absolute inset-0">
          <Image
            src={currentPhoto.url || "/placeholder.svg"}
            alt="Background"
            fill
            className="object-cover blur-2xl opacity-30"
            priority
          />
        </div>
      )}

      {/* Main Image */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`relative max-w-full max-h-full transition-all duration-${settings.transitionSpeed} ease-in-out ${
            transitionClass[settings.transition]
          }`}
        >
          <Image
            src={currentPhoto.url || "/placeholder.svg"}
            alt={currentPhoto.title || `Memory ${currentIndex + 1}`}
            width={1200}
            height={800}
            className={`max-w-full max-h-full object-contain shadow-2xl ${
              settings.transition === "kenburns" ? "animate-ken-burns" : ""
            }`}
            priority
          />
        </div>
      </div>

      {/* Progress Bar */}
      {settings.showProgress && isPlaying && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
          <div
            className="h-full bg-white/80 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Photo Metadata */}
      {settings.showMetadata && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="text-white">
            <h3 className="text-xl md:text-2xl font-light mb-2">{currentPhoto.title || "Untitled Memory"}</h3>
            <div className="flex items-center space-x-4 text-sm opacity-90">
              <span>{currentPhoto.uploaderName || "Anonymous"}</span>
              {currentPhoto.year && <span>• {currentPhoto.year}</span>}
              <span>• {new Date(currentPhoto.uploadedAt).toLocaleDateString()}</span>
              <span>
                • {currentIndex + 1} of {shuffledPhotos.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
          <Button onClick={prevPhoto} variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            onClick={togglePlayPause}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 rounded-full"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button onClick={nextPhoto} variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 rounded-full"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          onClick={toggleFullscreen}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 rounded-full"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-4 right-16 w-80">
          <Card className="bg-black/80 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-light">Slideshow Settings</h3>
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Timer className="h-4 w-4" />
                  <Label className="text-white">Duration: {settings.duration}s</Label>
                </div>
                <Slider
                  value={[settings.duration]}
                  onValueChange={([value]) => updateSetting("duration", value)}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Transition Speed */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <Label className="text-white">Transition Speed: {settings.transitionSpeed}ms</Label>
                </div>
                <Slider
                  value={[settings.transitionSpeed]}
                  onValueChange={([value]) => updateSetting("transitionSpeed", value)}
                  min={200}
                  max={2000}
                  step={100}
                  className="w-full"
                />
              </div>

              {/* Transition Type */}
              <div className="space-y-2">
                <Label className="text-white">Transition Effect</Label>
                <Select value={settings.transition} onValueChange={(value: any) => updateSetting("transition", value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="blur">Blur</SelectItem>
                    <SelectItem value="flip">Flip</SelectItem>
                    <SelectItem value="kenburns">Ken Burns</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shuffle className="h-4 w-4" />
                    <Label className="text-white">Shuffle Photos</Label>
                  </div>
                  <Switch checked={settings.shuffle} onCheckedChange={(checked) => updateSetting("shuffle", checked)} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <Label className="text-white">Show Metadata</Label>
                  </div>
                  <Switch
                    checked={settings.showMetadata}
                    onCheckedChange={(checked) => updateSetting("showMetadata", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="h-4 w-4" />
                    <Label className="text-white">Auto Start</Label>
                  </div>
                  <Switch
                    checked={settings.autoStart}
                    onCheckedChange={(checked) => updateSetting("autoStart", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-4 w-4" />
                    <Label className="text-white">Pause on Hover</Label>
                  </div>
                  <Switch
                    checked={settings.pauseOnHover}
                    onCheckedChange={(checked) => updateSetting("pauseOnHover", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4" />
                    <Label className="text-white">Show Progress</Label>
                  </div>
                  <Switch
                    checked={settings.showProgress}
                    onCheckedChange={(checked) => updateSetting("showProgress", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <EyeOff className="h-4 w-4" />
                    <Label className="text-white">Background Blur</Label>
                  </div>
                  <Switch
                    checked={settings.backgroundBlur}
                    onCheckedChange={(checked) => updateSetting("backgroundBlur", checked)}
                  />
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="pt-4 border-t border-white/20">
                <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
                <div className="text-xs space-y-1 opacity-80">
                  <div>Space/Enter: Play/Pause</div>
                  <div>← →: Previous/Next</div>
                  <div>F: Toggle Fullscreen</div>
                  <div>S: Toggle Settings</div>
                  <div>Esc: Exit Fullscreen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
