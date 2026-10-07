# Design

## Context

La tabla `tasks` tiene hoy `title`, `status` (enum), `assignee_id` y timestamps. La API tiene tres operaciones y el transformer expone `{ id, title, status, assignee }`.
- El `update` rechaza con 422 las claves `title`, `status` y `assigneeId` que llegan con `null`. Lo hace porque el bodyparser convierte `""` en `null`.
- Hay piezas de fechas ya disponibles:
  - `start/validator.ts` convierte toda salida de `vine.date()` en un `DateTime` de Luxon.
  - El generador de esquema mapea una columna `date` a `@column.date() declare x: DateTime`.
- Frontend:
  - Todas las llamadas pasan por `request()` en `lib/api.ts`.
  - No hay componente de fecha. El `Input` de `components/ui/` acepta cualquier `type`.
  - La página de Tareas no tiene vista de detalle.

Motivación y alcance: `proposal.md`. Comportamiento exigido: `specs/tasks/spec.md` y `specs/auth/spec.md`.

## Goals / Non-Goals

**Goals:**
- La regla de vencimiento vive en un único punto del backend y se evalúa en cada lectura con el día de quien mira.
- La fecha se guarda como fecha de calendario pura, sin hora ni huso, y nunca se desplaza un día al pasar por el servidor.
- La pantalla mínima de la tarea reutiliza los patrones existentes: `useAuthForm` para los errores por campo y `request()` para la API.

**Non-Goals:**
- Editar el título, el estado o el responsable desde la pantalla de la tarea.
- Persistir el huso de cada persona o calcular el día a partir de su zona IANA.
- Índices por `due_date`, porque no se ordena ni se filtra por fecha.

## Decisions

### D1. Columna `due_date` de tipo `date`, nullable

- La migración es `alterTable('tasks')` con `table.date('due_date').nullable()`. El `down` hace `dropColumn('due_date')`.
- Las filas existentes quedan a `NULL`, que significa «sin fecha». No hace falta migrar datos.
- `migration:run` regenera `TaskSchema` con `@column.date() declare dueDate: DateTime | null`.
- **Por qué `date` y no `datetime`.** La fecha es de calendario. Con `datetime`, un mismo valor tendría dos lecturas según el huso, que es justo el fallo de CA-5.
- **No hay columna `is_overdue`.** El veredicto se calcula (restricción 3).

### D2. Un único punto para la regla: `Task.isOverdueOn(today)`

```ts
isOverdueOn(today: string): boolean  // today = 'YYYY-MM-DD'
  return this.dueDate !== null && this.status !== 'done' && this.dueDate.toISODate()! < today
```

- La comparación es entre cadenas ISO `YYYY-MM-DD`, que se ordenan igual que las fechas. Así se evita comparar `DateTime` con zonas distintas.
- `<` estricto: «vence hoy» no está vencida (CA-5).
- Es el único sitio donde se decide. El frontend nunca lo recalcula: pinta `isOverdue` tal cual llega.
- Se descarta un scope SQL o una columna calculada: duplicaría la regla y complicaría el día por petición.

### D3. Día de referencia: cabecera `X-Client-Date`, con UTC por defecto

- **Helper `referenceDay(request): string`** en `app/services/reference_day.ts`, importado como `#services/reference_day`. El proyecto no tiene alias `#helpers/*` y sí `#services/*`.
  - Lee `request.header('x-client-date')`.
  - **Si falta**, devuelve `DateTime.utc().toISODate()`.
  - **Si existe**, exige el formato `^\d{4}-\d{2}-\d{2}$` y que `DateTime.fromISO(value, { zone: 'utc' }).isValid`, y lo devuelve tal cual.
  - **Si no es válida**, lanza `errors.E_VALIDATION_ERROR([{ field: 'X-Client-Date', rule: 'date', message: … }])`, que da 422 con el formato de VineJS.
- Se resuelve **al principio** de cada acción (`index`, `show`, `store` y `update`), antes de validar el cuerpo y de tocar la BD. Así, una cabecera inválida no deja nada modificado.
- **Por qué una cabecera.** No contamina el cuerpo ni los query params, y vale igual para GET, POST y PATCH.
- **Por qué UTC si falta.** Un cliente sin la cabecera (curl, otro consumidor) recibe igualmente un veredicto determinista y documentado.
- **CORS:** `config/cors.ts` tiene `headers: true`, que refleja las cabeceras pedidas. No hay que tocarlo.
- Se descarta la cabecera de zona IANA (`X-Timezone`): obliga a validar zonas y a depender del reloj del servidor. El día del cliente es exactamente lo que define CA-19.

### D4. Transformer con el día como parámetro

- `TaskTransformer` recibe el día como segundo argumento del constructor. `BaseTransformer.transform(data, ...rest)` reenvía los argumentos extra al constructor, según su `.d.ts`: `ExtractTransformerRestTypes`. Uso: `TaskTransformer.transform(tasks, today)`.
- `toObject()` añade:
  - `dueDate: this.resource.dueDate?.toISODate() ?? null`.
  - `isOverdue: this.resource.isOverdueOn(this.today)`.
- Así, toda representación de tarea lleva los dos campos (lista, lectura, creación y actualización), sin que ningún controlador pueda olvidarse.

### D5. Validación de `dueDate`

- Builder `dueDate = () => vine.date({ formats: ['YYYY-MM-DD'] })`. Con un formato estricto, «2026-02-30» y «2026-10-20T10:00:00Z» dan 422 con `field: 'dueDate'`.
- **Crear:** `dueDate: dueDate().nullable().optional()`.
- **Actualizar:** `dueDate: dueDate().nullable().optional()`. Además, el controlador **no** incluye `dueDate` en la lista de claves cuyo `null` se rechaza: un `null` explícito significa «quitar».
  - Como `optional()` trata `null` como ausente, el controlador distingue los dos casos así: si `Object.hasOwn(body, 'dueDate') && body.dueDate === null`, fija `task.dueDate = null` además del `merge`.
- **Riesgo de huso** al pasar de `Date` a `DateTime`. `vine.date` parsea la cadena y la transformación global la convierte a `DateTime`. Para que el día no se desplace según el huso del servidor, el controlador normaliza con `DateTime.fromISO(payload.dueDate.toISODate()!, { zone: 'utc' })` antes de asignar.
  - La verificación con curl comprueba la ida y vuelta: enviar `2026-10-20` devuelve `2026-10-20`.
- `isOverdue` no se declara en ningún validador, así que VineJS lo descarta sin error (restricción 3).

### D6. Lectura individual

- `GET /api/v1/tasks/:id` → `TasksController.show`, en el grupo `tasks` con el matcher numérico.
- Hace `Task.query().where('id', id).preload('assignee').firstOrFail()`, que da 404 si no existe, y `serialize(TaskTransformer.transform(task, today))`.
- **Decisión anotada**: es la superficie mínima que necesita «abrir la tarea». El punto abierto PA-6 (detalle completo) queda en el proposal.

### D7. Frontend: cliente de API

- `request()` añade siempre `X-Client-Date` con la fecha **local** del navegador, construida con `getFullYear()`, `getMonth() + 1` y `getDate()` rellenados con ceros. Se descarta `toISOString()`, que da la fecha UTC y rompería CA-19.
  - Se envía en todas las peticiones, incluidas las de auth, que la ignoran. Es más simple que decidir por endpoint.
- Tipos: `Task` gana `dueDate: string | null` e `isOverdue: boolean`, y `TaskPatch` gana `dueDate?: string | null`.
- Funciones: nueva `getTask(token, id)`. `updateTask` ya acepta el patch.
- Traducción: en `translate()`, para `field === 'dueDate'`, cualquier regla da «Introduce una fecha completa y válida.».

### D8. Frontend: pantalla `/tasks/:id`

- Página nueva `pages/task-page.tsx`, dentro de `ProtectedRoute`. En la lista, el título de cada fila pasa a ser un `Link` a `/tasks/:id`.
- **Contenido**, dentro de una `Card`:
  - Título, responsable (`fullName ?? 'Sin nombre'`) y estado, como texto.
  - El campo «Fecha de vencimiento (opcional)», un `Input type="date"`.
  - La señal «Vencida» si `isOverdue`.
  - El botón «Quitar fecha» si hay fecha.
  - Un enlace «Volver a la lista».
- **Guardado sin botón (CA-16) frente a fecha inválida (CA-14).** El `<input type="date">` devuelve `""` tanto para «vacío» como para «a medio escribir», y en Chrome teclear el año dispara `change` con años intermedios (`0002…`). Por eso:
  - Se guarda **al salir del campo (`onBlur`)** y con Enter, no en cada `change`.
  - Si al salir `input.validity.badInput` es `true`, la fecha está incompleta o es inválida: no se envía nada, se restaura el valor anterior en el input y se muestra «Introduce una fecha completa y válida.» con el mecanismo de errores por campo (`useAuthForm(['dueDate'])` y `failWith`).
  - Si el valor no cambió respecto a la tarea, no se envía nada.
  - Vaciar el campo a mano y salir equivale a quitar la fecha.
  - «Quitar fecha» envía `dueDate: null` directamente, sin diálogo (CA-15).
- **Reflejo inmediato**: tras cada `updateTask`, la tarea en pantalla se sustituye por la respuesta del servidor. Así, la fecha y la señal salen del backend, nunca de un cálculo local.
- **Señal de vencida**:
  - Un `Alert` con el icono `AlertCircleIcon` y el texto «Vencida», asociado al campo con `aria-describedby`.
  - No depende solo del color: lleva icono y texto.
  - Si no está vencida o no hay fecha, no se renderiza nada (CA-12).
- **Errores**:
  - 404 al cargar: «Esta tarea no existe.» y el enlace de vuelta.
  - Otros fallos de carga: aviso y «Reintentar», igual que en la lista.
  - Fallo al guardar: aviso general con el mensaje y la fecha anterior restaurada.

## Risks / Trade-offs

- **[Reloj del cliente mal puesto]** → El veredicto de esa persona será erróneo, pero nada se guarda con él. Se acepta: es la consecuencia directa de «el día de referencia es el de quien mira».
- **[Clientes sin `X-Client-Date` cerca de medianoche]** → Pueden ver un veredicto distinto al de su calendario. Está documentado como punto abierto. La web siempre envía la cabecera.
- **[Desplazamiento de un día por husos al parsear la fecha]** → Mitigado normalizando a UTC (D5) y comprobando la ida y vuelta con curl en la verificación.
- **[`onBlur` no se dispara si se cierra la pestaña con el foco en el campo]** → El cambio no se guarda. Se acepta. «Volver a la lista» quita el foco primero, así que el caso de CA-16 queda cubierto.
- **[La lista recibe `dueDate`/`isOverdue` que no pinta]** → Es intencionado: la representación es única (restricción 2). La lista sigue sin mostrarlos (CA-11), y la verificación lo comprueba.

## Migration Plan

1. `node ace migration:run` añade `due_date` y regenera `database/schema.ts`. Las tareas existentes quedan sin fecha.
2. Arrancar el dev server regenera `.adonisjs/` con la ruta `show`. Se commitea el diff.
3. Rollback: `node ace migration:rollback` elimina la columna y se revierte el commit. La API vuelve a su forma anterior.
