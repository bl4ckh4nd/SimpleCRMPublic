import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Fehler</CardTitle>
          <CardDescription>Etwas ist schiefgelaufen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Die Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut oder wenden Sie sich an den Support, wenn das Problem bestehen bleibt.
          </p>
          <Button asChild>
            <Link to="/">Zurück zum Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
