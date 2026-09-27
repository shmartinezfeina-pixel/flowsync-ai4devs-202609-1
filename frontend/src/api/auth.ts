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

interface ApiError {
  message: string
  rule?: string
  field?: string
  meta?: { min?: number; max?: number }
}

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'El nombre',
  email: 'El email',
  password: 'La contraseña',
  passwordConfirmation: 'La confirmación de contraseña',
}

const GENERIC_ERROR = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'

// Traduce un error del backend (VineJS o auth) a un mensaje claro en español
function translateError(error: ApiError, status: number): string {
  if (status === 401) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
  }
  const label = FIELD_LABELS[error.field ?? ''] ?? 'El campo'
  switch (error.rule) {
    case 'database.unique':
      return 'Ya existe una cuenta con este email.'
    case 'email':
      return 'Introduce un email válido.'
    case 'required':
      return `${label} es obligatorio.`
    case 'minLength':
      return `${label} debe tener al menos ${error.meta?.min} caracteres.`
    case 'maxLength':
      return `${label} no puede superar los ${error.meta?.max} caracteres.`
    case 'sameAs':
      return 'Las contraseñas no coinciden.'
    default:
      return GENERIC_ERROR
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiRequestError('No se pudo conectar con el servidor.', 0)
  }
  let body: { data?: T; errors?: ApiError[] } | null = null
  try {
    body = await res.json()
  } catch {
    // Respuesta no-JSON (p. ej. página de error del proxy): conservamos el status real
  }
  if (!res.ok) {
    // Nunca reenviar a la UI el message/stack de una excepción del servidor
    const messages =
      res.status < 500 && body?.errors?.length
        ? [...new Set(body.errors.map((e) => translateError(e, res.status)))]
        : [GENERIC_ERROR]
    throw new ApiRequestError(messages.join(' '), res.status)
  }
  if (!body) throw new ApiRequestError(GENERIC_ERROR, res.status)
  // El backend envuelve todas las respuestas en { data: ... }
  return body.data as T
}

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' }

export async function signup(
  fullName: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<AuthResponse> {
  return request<AuthResponse>(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      fullName: fullName.trim() || null,
      email,
      password,
      passwordConfirmation,
    }),
  })
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    return await request<AuthResponse>(`${BASE}/auth/login`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password }),
    })
  } catch (err) {
    // En /auth/login el 400 solo lo produce verifyCredentials (la validación da 422)
    if (err instanceof ApiRequestError && err.status === 400) {
      throw new ApiRequestError('Email o contraseña incorrectos.', 400)
    }
    throw err
  }
}

export async function getProfile(token: string): Promise<UserProfile> {
  return request<UserProfile>(`${BASE}/account/profile`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
}

export async function logout(token: string): Promise<void> {
  await fetch(`${BASE}/account/logout`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
}
