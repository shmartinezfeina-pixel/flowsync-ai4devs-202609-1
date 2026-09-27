import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { ApiRequestError, getProfile, logout, type UserProfile } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ProfilePage() {
  const { token, clearAuth } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getProfile(token)
      .then(setProfile)
      .catch((err) => {
        // Token inválido o caducado: al limpiar la sesión, ProtectedRoute redirige a /login
        if (err instanceof ApiRequestError && err.status === 401) {
          clearAuth()
          return
        }
        setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil')
      })
  }, [token, clearAuth])

  async function handleLogout() {
    if (token) {
      await logout(token).catch(() => {})
    }
    clearAuth()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        {error ? (
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        ) : !profile ? (
          <CardContent className="text-center text-muted-foreground">Cargando perfil…</CardContent>
        ) : (
          <>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {profile.initials}
              </div>
              <div>
                <CardTitle className="text-xl">{profile.fullName ?? profile.email}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="font-medium">#{profile.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Miembro desde</dt>
                  <dd className="font-medium">
                    {new Date(profile.createdAt).toLocaleDateString('es-ES')}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </>
        )}
        <CardFooter className="pt-6">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
