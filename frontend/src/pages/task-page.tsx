import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertCircleIcon, ArrowLeftIcon, Loader2Icon } from 'lucide-react'
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
import { TASK_STATUS_LABELS, type Task } from '@/lib/types'

const FIELDS = ['dueDate'] as const

const INVALID_DATE = 'Introduce una fecha completa y válida.'

/** Espera tras el último cambio antes de guardar una fecha completa. */
const SAVE_DELAY_MS = 500

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

const messageOf = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

/**
 * Una fecha que ya merece guardarse: completa, real para el navegador y con un
 * año de cuatro cifras. Al teclear el año pasan valores como `0002-10-20`.
 */
const isCompleteDate = (input: HTMLInputElement) =>
  !input.validity.badInput &&
  /^\d{4}-\d{2}-\d{2}$/.test(input.value) &&
  Number(input.value.slice(0, 4)) >= 1000

/**
 * React Router reutiliza el componente al pasar de `/tasks/1` a `/tasks/2`
 * (Atrás, Adelante, URL a mano). Con `key` cada tarea tiene su propio estado y
 * sus propios refs: un guardado en vuelo nunca acaba en la tarea equivocada.
 */
export function TaskPage() {
  const { id } = useParams()
  return <TaskView key={id} taskId={Number(id)} />
}

function TaskView({ taskId }: { taskId: number }) {
  const { token } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const { formError, fieldErrors, submit, failWith } = useAuthForm(FIELDS)

  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  // Estado del guardado, en refs para que los temporizadores y el desmontaje
  // vean siempre lo último sin depender de un render.
  const savedRef = useRef<string | null>(null)
  const pendingRef = useRef<string | null | undefined>(undefined)
  const inFlightRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showSaved = useCallback((value: string | null) => {
    setDraft(value ?? '')
    // Un input de fecha a medio escribir no refleja `value` de React: se fuerza.
    if (inputRef.current) inputRef.current.value = value ?? ''
  }, [])

  const loadTask = useCallback(() => {
    if (!token) return () => undefined

    let cancelled = false
    setLoadState('loading')
    setLoadError(null)

    api
      .getTask(token, taskId)
      .then((loaded) => {
        if (cancelled) return
        savedRef.current = loaded.dueDate
        setTask(loaded)
        setDraft(loaded.dueDate ?? '')
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          setLoadState('not-found')
          return
        }
        setLoadError(messageOf(error))
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [token, taskId])

  useEffect(() => loadTask(), [loadTask])

  /**
   * Envía lo pendiente, de uno en uno: si llega otro valor mientras hay una
   * petición en vuelo, se envía al terminar y solo cuenta el último.
   */
  const flush = useCallback(async () => {
    if (!token || inFlightRef.current) return
    const value = pendingRef.current
    if (value === undefined) return
    pendingRef.current = undefined
    if (value === savedRef.current) return

    inFlightRef.current = true
    let saved = false
    await submit(async () => {
      const updated = await api.updateTask(token, taskId, { dueDate: value })
      saved = true
      savedRef.current = updated.dueDate
      if (mountedRef.current) setTask(updated)
    })
    inFlightRef.current = false

    if (pendingRef.current !== undefined) {
      void flush()
    } else if (mountedRef.current && !saved) {
      showSaved(savedRef.current)
    }
  }, [token, taskId, submit, showSaved])

  const cancelTimer = () => {
    clearTimeout(timerRef.current)
    timerRef.current = undefined
  }

  // Al salir de la pantalla (Atrás, «Volver a la lista»…) se envía lo pendiente
  // sin esperar: la petición sigue en vuelo aunque el componente desaparezca.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      void flush()
    }
  }, [flush])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    setDraft(input.value)
    cancelTimer()
    if (!isCompleteDate(input)) {
      // Lo pendiente ya no es lo que hay en el campo: no debe enviarse al salir.
      pendingRef.current = undefined
      return
    }

    pendingRef.current = input.value
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined
      void flush()
    }, SAVE_DELAY_MS)
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const input = event.target
    cancelTimer()

    if (input.validity.badInput || (input.value && !isCompleteDate(input))) {
      pendingRef.current = undefined
      showSaved(savedRef.current)
      failWith('dueDate', INVALID_DATE)
      return
    }

    // Vaciar el campo a mano y salir equivale a quitar la fecha.
    pendingRef.current = input.value === '' ? null : input.value
    void flush()
  }

  const handleClear = () => {
    cancelTimer()
    showSaved(null)
    pendingRef.current = null
    void flush()
  }

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">FlowSync</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/tasks">
              <ArrowLeftIcon />
              Volver a la lista
            </Link>
          </Button>
        </header>

        {loadState === 'loading' && (
          <div
            className="flex justify-center py-8"
            role="status"
            aria-live="polite"
          >
            <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
            <span className="sr-only">Cargando tarea…</span>
          </div>
        )}

        {loadState === 'not-found' && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>Esta tarea no existe.</AlertDescription>
          </Alert>
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
              onClick={() => loadTask()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {loadState === 'ready' && task && (
          <Card>
            <CardHeader>
              <CardTitle className="wrap-anywhere">{task.title}</CardTitle>
              <CardDescription>Tarea del equipo</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-6">
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Responsable</dt>
                  <dd className="font-medium">
                    {task.assignee.fullName ?? 'Sin nombre'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd className="font-medium">
                    {TASK_STATUS_LABELS[task.status]}
                  </dd>
                </div>
              </dl>

              <div className="grid gap-2">
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircleIcon />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex min-h-6 items-center justify-between gap-4">
                  <Label htmlFor="dueDate">
                    Fecha de vencimiento{' '}
                    <span className="text-muted-foreground font-normal">
                      (opcional)
                    </span>
                  </Label>
                  {/* Siempre presente para que el cambio se anuncie; el
                      veredicto llega del servidor, nunca se calcula aquí. */}
                  <span id="due-status" role="status">
                    {task.isOverdue && (
                      <span className="text-destructive inline-flex items-center gap-1 text-sm font-medium">
                        <AlertCircleIcon className="size-4" aria-hidden />
                        Vencida
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={draft}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(fieldErrors.dueDate)}
                    aria-describedby={
                      fieldErrors.dueDate
                        ? 'due-status dueDate-error'
                        : 'due-status'
                    }
                  />
                  {task.dueDate && (
                    <Button
                      type="button"
                      variant="outline"
                      // Sin esto, el clic dispararía antes el blur del campo y,
                      // con una fecha a medio escribir, el aviso de error.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={handleClear}
                    >
                      Quitar fecha
                    </Button>
                  )}
                </div>

                <div className="min-h-5">
                  <FieldError
                    id="dueDate-error"
                    message={fieldErrors.dueDate}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
