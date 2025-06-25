"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Archive } from "lucide-react"

export function DownloadSection() {
  const [downloading, setDownloading] = useState(false)

  const handleDownloadAll = async () => {
    setDownloading(true)
    try {
      const response = await fetch("/api/download-all")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "brian-quain-memories.zip"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error("Download failed")
      }
    } catch (error) {
      console.error("Download error:", error)
      alert("Download failed. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="text-center max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-light text-gray-700 mb-8">download collection</h2>
      <p className="text-gray-600 mb-8 font-light">get all memories in one archive</p>
      <Button
        onClick={handleDownloadAll}
        disabled={downloading}
        className="bg-gray-800 hover:bg-gray-700 text-white font-light px-8 py-3 transition-all duration-200"
      >
        <Archive className="mr-2 h-4 w-4" />
        {downloading ? "creating archive..." : "download all"}
      </Button>
    </section>
  )
}
