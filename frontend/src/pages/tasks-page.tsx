import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import { TASK_STATUS_LABELS, type Task, type TaskStatus } from '@/lib/types'

const FIELDS = ['title'] as const

const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[]

type LoadState = 'loading' | 'ready' | 'error'

const messageOf = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

export function TasksPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  // Error del último cambio de estado hecho desde una fila.
  const [actionError, setActionError] = useState<string | null>(null)
  // Filas con un cambio de estado en vuelo: sus botones quedan bloqueados.
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set())
  const [title, setTitle] = useState('')
  const { isSubmitting, formError, fieldErrors, submit } = useAuthForm(FIELDS)

  const loadTasks = useCallback(() => {
    if (!token) return () => undefined

    let cancelled = false
    setLoadState('loading')
    setLoadError(null)

    api
      .listTasks(token)
      .then((list) => {
        if (cancelled) return
        // Sin regla de orden decidida: se pintan tal y como llegan.
        setTasks(list)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(messageOf(error))
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => loadTasks(), [loadTasks])

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return

    return submit(async () => {
      const task = await api.createTask(token, title)
      // Se añade al final de lo que ya se ve: añadir no es ordenar.
      setTasks((current) => [...current, task])
      setTitle('')
    })
  }

  const setBusy = (id: number, busy: boolean) =>
    setBusyIds((current) => {
      const next = new Set(current)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })

  const replaceTask = (id: number, change: (task: Task) => Task) =>
    setTasks((current) =>
      current.map((task) => (task.id === id ? change(task) : task)),
    )

  const changeStatus = async (task: Task, status: TaskStatus) => {
    if (!token || status === task.status) return

    const previous = task.status
    setActionError(null)
    // Optimista: la fila cambia al momento y se deshace si el servidor falla.
    replaceTask(task.id, (current) => ({ ...current, status }))
    setBusy(task.id, true)

    try {
      const updated = await api.updateTask(token, task.id, { status })
      replaceTask(task.id, () => updated)
    } catch (error) {
      replaceTask(task.id, (current) => ({ ...current, status: previous }))
      setActionError(messageOf(error))
    } finally {
      setBusy(task.id, false)
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">FlowSync</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile">Perfil</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Tareas</CardTitle>
            <CardDescription>
              Una sola lista para todo el equipo: quién lleva cada tarea y en
              qué estado está.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <form onSubmit={handleCreate} className="grid gap-2" noValidate>
              {formError && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Label htmlFor="title">Nueva tarea</Label>
              <div className="flex gap-2">
                <Input
                  id="title"
                  name="title"
                  placeholder="¿En qué andas?"
                  autoComplete="off"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={
                    fieldErrors.title ? 'title-error' : undefined
                  }
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando…' : 'Crear tarea'}
                </Button>
              </div>
              <FieldError id="title-error" message={fieldErrors.title} />
            </form>

            {actionError && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            {loadState === 'loading' && (
              <div
                className="flex justify-center py-8"
                role="status"
                aria-live="polite"
              >
                <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
                <span className="sr-only">Cargando tareas…</span>
              </div>
            )}

            {loadState === 'error' && (
              <div className="grid gap-3">
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="justify-self-start"
                  onClick={() => loadTasks()}
                >
                  Reintentar
                </Button>
              </div>
            )}

            {loadState === 'ready' && tasks.length === 0 && (
              <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                <p className="text-foreground font-medium">
                  Todavía no hay tareas.
                </p>
                <p className="mt-1">
                  Aquí verá todo el equipo en qué anda cada uno. Escribe arriba
                  el título de la primera tarea para empezar.
                </p>
              </div>
            )}

            {loadState === 'ready' && tasks.length > 0 && (
              <ul className="divide-y rounded-md border">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <p className="text-muted-foreground text-sm">
                        {task.assignee.fullName ?? 'Sin nombre'}
                      </p>
                    </div>

                    <div
                      role="group"
                      aria-label={`Estado de «${task.title}»`}
                      className="flex gap-1"
                    >
                      {STATUSES.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={
                            status === task.status ? 'default' : 'outline'
                          }
                          aria-pressed={status === task.status}
                          disabled={busyIds.has(task.id)}
                          onClick={() => changeStatus(task, status)}
                        >
                          {TASK_STATUS_LABELS[status]}
                        </Button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
