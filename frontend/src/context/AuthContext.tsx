import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { UserProfile } from '../api/auth'

interface AuthState {
  token: string | null
  user: UserProfile | null
}

interface AuthContextValue extends AuthState {
  setAuth: (token: string, user: UserProfile) => void
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token')
    return { token, user: null }
  })

  const setAuth = useCallback((token: string, user: UserProfile) => {
    localStorage.setItem('token', token)
    setState({ token, user })
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token')
    setState({ token: null, user: null })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
