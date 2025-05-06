import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default async function PrivatePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  // Extract first letter of email for avatar fallback
  const emailInitial = data.user.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Welcome to your private area</CardTitle>
          <CardDescription>
            This page is only accessible to authenticated users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={data.user.user_metadata?.avatar_url || ''} alt="User avatar" />
              <AvatarFallback>{emailInitial}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium">Logged in as:</h3>
              <p className="text-sm">{data.user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
