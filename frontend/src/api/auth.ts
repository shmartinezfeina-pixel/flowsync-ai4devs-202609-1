const BASE = '/api/v1'

export interface UserProfile {
  id: number
  fullName: string | null
  email: string
  createdAt: string
  updatedAt: string | null
  initials: string
}

export interface AuthResponse {
  user: UserProfile
  token: string
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    // Extrae mensaje legible: errores de validación o mensaje genérico
    if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors.map((e: { message: string }) => e.message).join('. '))
    }
    throw new Error(data.message ?? 'Error desconocido')
  }
  return data as T
}

export async function signup(
  fullName: string,
  email: string,
  password: string,
  passwordConfirmation: string
): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: fullName || null, email, password, passwordConfirmation }),
  })
  return handleResponse<AuthResponse>(res)
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse<AuthResponse>(res)
}

export async function getProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/account/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse<UserProfile>(res)
}

export async function logout(token: string): Promise<void> {
  await fetch(`${BASE}/account/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}
