import { list } from "@vercel/blob"
import { NextResponse } from "next/server"
import JSZip from "jszip"

export async function GET() {
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: "Vercel Blob not configured. Please add the Blob integration to enable downloads.",
        },
        { status: 400 },
      )
    }

    const { blobs } = await list()

    // Filter out profile pictures - only include photo uploads
    const photoBlobs = blobs.filter((blob) => {
      // Profile pictures typically have 'profile' in their pathname or are in a profiles folder
      const pathname = blob.pathname.toLowerCase()
      return !pathname.includes("profile") && !pathname.startsWith("profiles/")
    })

    if (photoBlobs.length === 0) {
      return NextResponse.json({ error: "No photos to download" }, { status: 404 })
    }

    const zip = new JSZip()

    // Download all photo images and add to zip (excluding profile pictures)
    const downloadPromises = photoBlobs.map(async (blob) => {
      const response = await fetch(blob.url)
      const arrayBuffer = await response.arrayBuffer()
      const filename = blob.pathname.split("-").slice(1).join("-") || blob.pathname
      zip.file(filename, arrayBuffer)
    })

    await Promise.all(downloadPromises)

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="brian-quain-memories.zip"',
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      {
        error: "Vercel Blob not configured. Please add the Blob integration to enable downloads.",
      },
      { status: 500 },
    )
  }
}
