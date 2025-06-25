import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeSelector } from "./theme-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ProfilePage = () => {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="themes">Themes</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-6">
        {/* Keep all existing profile content here */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{/* All existing profile form content */}</CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="themes" className="space-y-6">
        <ThemeSelector />
      </TabsContent>
    </Tabs>
  )
}

export default ProfilePage
