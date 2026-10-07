/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/** Los tres estados de una tarea tal y como viajan por la API. */
export type TaskStatus = 'pending' | 'in_progress' | 'done'

/** Única traducción de identificador de estado a texto en pantalla. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

/**
 * Espejo de `TaskTransformer` del backend. Del responsable solo llega lo que
 * la lista necesita: nunca su email.
 */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  /** Fecha de calendario `YYYY-MM-DD`, o `null` si no tiene. */
  dueDate: string | null
  /** Veredicto del servidor para el día de quien mira; nunca se calcula aquí. */
  isOverdue: boolean
  assignee: {
    id: number
    fullName: string | null
  }
}

/** Campos que acepta `PATCH /tasks/:id`; los ausentes no cambian. */
export type TaskPatch = Partial<{
  title: string
  status: TaskStatus
  assigneeId: number
  /** `null` quita la fecha. */
  dueDate: string | null
}>
