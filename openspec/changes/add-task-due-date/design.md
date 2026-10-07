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
  if (!this.dueDate || this.status === 'done') return false
  return this.dueDate.toISODate()! < today
```

- **`!this.dueDate` y no `!== null`.** Tras `Task.create` sin fecha, Lucid solo rehidrata la clave primaria, así que `dueDate` queda `undefined`, no `null`. Con `!== null` se ejecutaría `undefined.toISODate()` y la creación por defecto (CA-1) daría 500.

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
  - Con `.nullable().optional()`, VineJS devuelve `null` si la clave llega con `null` y `undefined` si no llega (comprobado en la revisión). `task.merge(payload)` asigna el `null` e ignora el `undefined`, así que no hace falta ninguna rama especial para quitar la fecha.
  - Tras el bodyparser, `""` y `"   "` llegan como `null`, así que quitar con vacío funciona igual.
- **Sin desplazamiento por husos.** `vine.date` devuelve un `DateTime` a medianoche local. Tanto su `toISODate()` como el `prepare` de `@column.date` (que usa `toISODate()`) y la lectura (`DateTime.fromSQL`) trabajan en la misma zona. La revisión lo comprobó con `TZ` en UTC, Los Ángeles y Auckland. No hace falta normalizar; el controlador asigna el valor validado tal cual.
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
- Traducción en `translate()`:
  - Para `field === 'dueDate'`, cualquier regla da «Introduce una fecha completa y válida.».
  - Para `field === 'X-Client-Date'`, da «La fecha de tu dispositivo no es válida. Revisa el reloj del sistema.». Es improbable, porque la web siempre envía una fecha bien formada, pero no debe salir el genérico «Revisa el campo.».
  - `referenceDay` solo se llama en las acciones de tareas, así que una cabecera rara nunca rompe el login.

### D8. Frontend: pantalla `/tasks/:id`

- Página nueva `pages/task-page.tsx`, dentro de `ProtectedRoute`. En la lista, el título de cada fila pasa a ser un `Link` a `/tasks/:id`.
- **Contenido**, dentro de una `Card`:
  - Título, responsable (`fullName ?? 'Sin nombre'`) y estado, como texto.
  - El campo «Fecha de vencimiento (opcional)», un `Input type="date"`.
  - La señal «Vencida» si `isOverdue`.
  - El botón «Quitar fecha» si hay fecha.
  - Un enlace «Volver a la lista».
- **Guardado sin botón (CA-16) frente a fecha inválida (CA-14).** El `<input type="date">` devuelve `""` tanto para «vacío» como para «a medio escribir». Al teclear el año pueden aparecer valores intermedios con años de menos de cuatro cifras significativas (`0002-…`), y el selector de calendario dispara `change` sin quitar el foco. Por eso hay tres disparadores de guardado:
  1. **En `change`, con espera.** Si el valor es una fecha completa (`/^\d{4}-\d{2}-\d{2}$/`, `validity.badInput` a `false` y año ≥ 1000), se programa el guardado con una espera de 500 ms. Cada `change` nuevo reinicia la espera. Así, elegir un día en el calendario guarda y refleja la señal sin salir del campo (CA-2), y los años a medio teclear no se envían.
  2. **Al salir del campo (`onBlur`).** Se envía de inmediato lo pendiente.
     - Si `badInput` es `true`, la fecha está incompleta: no se envía nada, se restaura en el input el valor guardado y se muestra «Introduce una fecha completa y válida.» con el error por campo (`useAuthForm(['dueDate'])` y `failWith`).
     - Si el campo queda vacío sin `badInput`, se quita la fecha.
  3. **Al desmontar la página** (botón Atrás, «Volver a la lista» o cualquier navegación). Si hay un guardado pendiente, se envía en ese momento sin esperar respuesta: el `fetch` sigue en vuelo aunque el componente desaparezca.
- **Reglas comunes de los tres disparadores:**
  - Si el valor coincide con el guardado, no se envía nada.
  - Las peticiones se serializan: solo hay una en vuelo por pantalla. Si llega otro valor mientras tanto, se envía al terminar la anterior y solo cuenta el último.
  - No hay envío con Enter: no se promete un atajo que el input de fecha no da por sí solo.
- **«Quitar fecha»** envía `dueDate: null` directamente, sin diálogo (CA-15), y cancela cualquier guardado pendiente.
  - Lleva `onMouseDown={(e) => e.preventDefault()}` para que pulsarlo no provoque antes el blur del campo. Así, con una fecha a medio escribir, «Quitar fecha» quita la fecha en vez de mostrar el error de fecha incompleta.
- **Sin saltos de maquetación.** La señal «Vencida» va en línea, en la misma fila que la etiqueta del campo, y el hueco del error bajo el campo tiene altura reservada. Así, aparecer o desaparecer entre `mousedown` y `mouseup` no desplaza «Quitar fecha» ni «Volver a la lista».
- **Reflejo inmediato**: tras cada `updateTask`, la tarea en pantalla se sustituye por la respuesta del servidor. Así, la fecha y la señal salen del backend, nunca de un cálculo local.
- **Señal de vencida**:
  - Un elemento en línea, con el icono `AlertCircleIcon`, el texto «Vencida» y los colores destructivos del tema. Va asociado al campo con `aria-describedby` y con `role="status"`, para que se anuncie al aparecer tras un guardado.
  - No depende solo del color: lleva icono y texto.
  - Si no está vencida o no hay fecha, no se renderiza nada (CA-12).
- **Errores**:
  - 404 al cargar: «Esta tarea no existe.» y el enlace de vuelta.
  - Otros fallos de carga: aviso y «Reintentar», igual que en la lista.
  - Fallo al guardar: aviso general con el mensaje y la fecha anterior restaurada.

## Risks / Trade-offs

- **[Reloj del cliente mal puesto]** → El veredicto de esa persona será erróneo, pero nada se guarda con él. Se acepta: es la consecuencia directa de «el día de referencia es el de quien mira».
- **[Clientes sin `X-Client-Date` cerca de medianoche]** → Pueden ver un veredicto distinto al de su calendario. Está documentado como punto abierto. La web siempre envía la cabecera.
- **[Cerrar la pestaña o el navegador con un guardado pendiente]** → Si se cierra en los 500 ms de espera, el desmontaje no llega a ejecutarse y el cambio se pierde. Se acepta. Cualquier navegación dentro de la app, incluido el botón Atrás, sí envía lo pendiente.
- **[Un guardado enviado al salir de la pantalla falla]** → Por red caída, 401 tras cerrar sesión o 422, el error no se muestra porque la pantalla ya no existe, y el cambio se pierde sin aviso. Se acepta: es poco frecuente y el valor anterior queda intacto en el servidor.
- **[Pasar de una tarea a otra sin pasar por la lista]** → Con Atrás o Adelante, React Router reutilizaría la pantalla. Se monta con `key` por tarea, para que el estado y los guardados en vuelo nunca se crucen entre tareas.
- **[Reabrir la tarea antes de que termine el guardado enviado al salir]** → La lectura puede llegar antes que el `PATCH` y mostrar la fecha anterior durante un instante. Recargar lo corrige. Es muy improbable en local. Se acepta, porque esperar la respuesta antes de navegar añadiría fricción a CA-16.
- **[Comportamiento de `<input type="date">` entre navegadores]** → `badInput` y los eventos al teclear varían entre Chrome, Firefox y Safari. La verificación en navegador (tareas 4.2 y 6.1) lo comprueba al menos en Chrome. Las reglas de guardado (fecha completa y año ≥ 1000) no dependen de un navegador concreto, y el servidor rechaza igualmente cualquier fecha imposible.
- **[La lista recibe `dueDate`/`isOverdue` que no pinta]** → Es intencionado: la representación es única (restricción 2). La lista sigue sin mostrarlos (CA-11), y la verificación lo comprueba.

## Migration Plan

1. `node ace migration:run` añade `due_date` y regenera `database/schema.ts`. Las tareas existentes quedan sin fecha.
2. Arrancar el dev server regenera `.adonisjs/` con la ruta `show`. Se commitea el diff.
3. Rollback: `node ace migration:rollback` elimina la columna y se revierte el commit. La API vuelve a su forma anterior.
