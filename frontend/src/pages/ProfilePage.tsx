import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, logout } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import type { UserProfile } from '../api/auth'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { token, clearAuth } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    getProfile(token)
      .then(setProfile)
      .catch(() => {
        clearAuth()
        navigate('/login')
      })
  }, [token, navigate, clearAuth])

  async function handleLogout() {
    if (token) {
      await logout(token).catch(() => {})
    }
    clearAuth()
    navigate('/login')
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Cargando perfil…
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
            {profile.initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {profile.fullName ?? profile.email}
            </h1>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">ID</dt>
            <dd className="font-medium text-gray-900">#{profile.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Miembro desde</dt>
            <dd className="font-medium text-gray-900">
              {new Date(profile.createdAt).toLocaleDateString('es-ES')}
            </dd>
          </div>
        </dl>
        <button
          onClick={handleLogout}
          className="mt-6 w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
