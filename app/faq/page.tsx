import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Camera,
  Heart,
  MessageCircle,
  Filter,
  Download,
  User,
  Upload,
  Grid3X3,
  Calendar,
  Tag,
  Search,
  Settings,
  Shield,
} from "lucide-react"

export const metadata: Metadata = {
  title: "FAQ - Brian Memorial Gallery",
  description: "Frequently asked questions and instructions for using the Brian Memorial Gallery",
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Learn how to use all the features of the Brian Memorial Gallery to share memories, connect with others, and
            preserve precious moments.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              ← Back to Gallery
            </Button>
          </Link>
        </div>

        {/* Quick Navigation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" />
              Quick Navigation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <a href="#getting-started" className="text-blue-600 hover:underline">
                Getting Started
              </a>
              <a href="#viewing-photos" className="text-blue-600 hover:underline">
                Viewing Photos
              </a>
              <a href="#filtering" className="text-blue-600 hover:underline">
                Filtering & Search
              </a>
              <a href="#uploading" className="text-blue-600 hover:underline">
                Uploading Photos
              </a>
              <a href="#interacting" className="text-blue-600 hover:underline">
                Comments & Likes
              </a>
              <a href="#profile" className="text-blue-600 hover:underline">
                Profile Management
              </a>
              <a href="#downloading" className="text-blue-600 hover:underline">
                Downloading
              </a>
              <a href="#troubleshooting" className="text-blue-600 hover:underline">
                Troubleshooting
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="mb-8" id="getting-started">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Do I need to create an account?</h3>
              <p className="text-gray-600">
                You can browse and view all photos without an account. However, to upload photos, add comments, like
                photos, or manage your profile, you'll need to sign up for a free account.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I create an account?</h3>
              <p className="text-gray-600">
                Click the "Sign In" button in the top right corner, then select "Sign Up" in the modal. You'll need to
                provide your name, email address, and create a password.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is my information secure?</h3>
              <p className="text-gray-600">
                Yes! All passwords are securely encrypted, and we only collect the minimum information needed to provide
                the service. We never share your personal information with third parties.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Viewing Photos */}
        <Card className="mb-8" id="viewing-photos">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="mr-2 h-5 w-5" />
              Viewing Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Grid3X3 className="mr-2 h-4 w-4" />
                Gallery View vs Instagram View
              </h3>
              <p className="text-gray-600 mb-2">
                Use the view toggle buttons at the top to switch between two viewing modes:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>
                  <strong>Gallery View:</strong> Clean grid layout perfect for browsing many photos
                </li>
                <li>
                  <strong>Instagram View:</strong> Social media style with comments, likes, and user info visible
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I view a photo in full size?</h3>
              <p className="text-gray-600">
                Click on any photo to open it in a modal window where you can see the full-size image, read all
                comments, add your own comments, and like the photo.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What information can I see about each photo?</h3>
              <p className="text-gray-600">
                Each photo shows the uploader's name, upload date, tags, and year. In Instagram view, you can also see
                the number of likes and comments directly on the feed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filtering and Search */}
        <Card className="mb-8" id="filtering">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtering & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Tag className="mr-2 h-4 w-4 text-blue-500" />
                Tag Filtering
              </h3>
              <p className="text-gray-600 mb-2">Filter photos by tags to find specific types of memories:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>Click on any tag (blue chips) to add it to your filter</li>
                <li>Click multiple tags to show photos that have ANY of those tags</li>
                <li>Click a selected tag again to remove it from the filter</li>
                <li>Tags show the number of photos that have that tag</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-green-500" />
                Year Filtering
              </h3>
              <p className="text-gray-600 mb-2">Filter photos by year to find memories from specific time periods:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>Click on any year (green chips) to filter by that year</li>
                <li>Select multiple years to show photos from any of those years</li>
                <li>Years show the number of photos from that year</li>
                <li>Years are sorted with the most recent first</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I combine tag and year filters?</h3>
              <p className="text-gray-600">
                Yes! You can select both tags and years. Photos must match your selected tags AND be from your selected
                years. For example, you can find "family" photos from "2020" and "2021".
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I clear filters?</h3>
              <p className="text-gray-600">
                Use the "Clear All" button to remove all filters, or click the "×" on individual filter chips to remove
                specific filters.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Uploading Photos */}
        <Card className="mb-8" id="uploading">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Uploading Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How do I upload photos?</h3>
              <p className="text-gray-600">
                You must be signed in to upload photos. Look for the upload section on the main page, where you can drag
                and drop photos or click to select them from your device.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What photo formats are supported?</h3>
              <p className="text-gray-600">
                We support common image formats including JPEG, PNG, GIF, and WebP. Photos are automatically optimized
                for web viewing while preserving quality.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I add tags and year information?</h3>
              <p className="text-gray-600">
                Yes! When uploading, you can add tags (like "family", "vacation", "birthday") and specify the year the
                photo was taken. This helps others find and filter your photos.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a limit to how many photos I can upload?</h3>
              <p className="text-gray-600">
                There's no strict limit, but please be considerate of storage space. Focus on sharing meaningful
                memories rather than uploading everything.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Interacting with Photos */}
        <Card className="mb-8" id="interacting">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="mr-2 h-5 w-5" />
              Comments & Likes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Heart className="mr-2 h-4 w-4 text-red-500" />
                Liking Photos
              </h3>
              <p className="text-gray-600">
                Show appreciation for photos by clicking the heart icon. You must be signed in to like photos. You can
                see the total number of likes on each photo.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <MessageCircle className="mr-2 h-4 w-4 text-blue-500" />
                Adding Comments
              </h3>
              <p className="text-gray-600">
                Share memories and thoughts by commenting on photos. Click on a photo to open the modal, then scroll
                down to see existing comments and add your own.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I see all comments on a photo?</h3>
              <p className="text-gray-600">
                In Instagram view, click "View all X comments" to open the photo modal. In Gallery view, click on the
                photo itself to see all comments.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I edit or delete my comments?</h3>
              <p className="text-gray-600">
                Currently, comments cannot be edited or deleted once posted. Please think carefully before posting. If
                you need a comment removed, contact an administrator.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Management */}
        <Card className="mb-8" id="profile">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Profile Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How do I access my profile?</h3>
              <p className="text-gray-600">
                Click on your profile picture in the top right corner, then select "Profile Settings" from the dropdown
                menu.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What can I do in my profile?</h3>
              <p className="text-gray-600 mb-2">Your profile page allows you to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>View and update your personal information</li>
                <li>Upload or change your profile picture</li>
                <li>See all photos you've uploaded</li>
                <li>View your activity statistics (uploads, comments, likes)</li>
                <li>Change your password</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I change my profile picture?</h3>
              <p className="text-gray-600">
                In your profile settings, click on your current profile picture or the camera icon to upload a new
                image. The image will be automatically resized and cropped to fit.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Downloading */}
        <Card className="mb-8" id="downloading">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="mr-2 h-5 w-5" />
              Downloading Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Can I download photos?</h3>
              <p className="text-gray-600">
                Yes! Look for the download section on the main page where you can download individual photos or all
                photos as a ZIP file.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do I need an account to download?</h3>
              <p className="text-gray-600">
                No, downloading is available to all visitors. However, some features like bulk downloads might require
                signing in.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What quality are the downloaded photos?</h3>
              <p className="text-gray-600">
                Downloaded photos are provided in their original uploaded quality. We preserve the full resolution and
                quality of uploaded images.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Features */}
        <Card className="mb-8" id="admin">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Admin Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What are admin features?</h3>
              <p className="text-gray-600">
                Administrators have additional capabilities to manage the site, including moderating content, managing
                users, and accessing site statistics.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I become an admin?</h3>
              <p className="text-gray-600">
                Admin access is restricted and granted only by existing administrators. If you need admin access,
                contact the site owner.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-8" id="troubleshooting">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Photos aren't loading properly</h3>
              <p className="text-gray-600">
                Try refreshing the page. If problems persist, check your internet connection or try using a different
                browser.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">I can't sign in to my account</h3>
              <p className="text-gray-600">
                Make sure you're using the correct email and password. If you've forgotten your password, contact an
                administrator for assistance with password reset.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Upload is failing</h3>
              <p className="text-gray-600">
                Ensure your image file is in a supported format (JPEG, PNG, GIF, WebP) and not too large. Try uploading
                one photo at a time if bulk upload fails.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">I found a bug or have a suggestion</h3>
              <p className="text-gray-600">
                Please contact the site administrator with details about any issues you encounter or suggestions for
                improvements.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              If you can't find the answer to your question here, don't hesitate to reach out for additional support.
            </p>
            <Link href="/">
              <Button>← Return to Gallery</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
