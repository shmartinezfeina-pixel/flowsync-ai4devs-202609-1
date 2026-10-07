# Design

## Context

Hoy el backend solo tiene el vertical de cuentas y acceso:
- Tabla `users` y tokens opacos.
- Grupo `/api/v1` con un subgrupo protegido por `middleware.auth()`.
- Respuestas envueltas por `serialize()`, pasando por transformers.

El frontend tiene tres pantallas. Los guards `ProtectedRoute` y `PublicOnlyRoute` redirigen a `/profile`, que es también el destino del comodín `*`. Todo el acceso a la API pasa por `lib/api.ts`, que traduce los errores de VineJS a `ApiError` con `fieldErrors`. Los componentes disponibles en `components/ui/` son `alert`, `button`, `card`, `input` y `label`; no hay `select`, `badge` ni `table`.

Restricciones de la petición, que el diseño no reabre:
- No hay dependencias nuevas, design system nuevo ni tests.
- No hay fecha de vencimiento.
- Solo hay tres operaciones.
- No se ordena explícitamente.

Motivación y alcance: ver `proposal.md`. Comportamiento exigido: ver `specs/tasks/spec.md` y `specs/auth/spec.md`.

## Goals / Non-Goals

**Goals:**
- Una tabla, un modelo y tres endpoints que sigan exactamente los patrones del vertical de auth: esquema generado, transformers, `serialize()`, `vine.create` e imports por subpath.
- Exponer del responsable solo `{ id, fullName }`, para no filtrar datos de cuenta a una vista que no los usa.
- Una pantalla de Tareas hecha solo con los componentes existentes, y el cambio de estado en un único clic.

**Non-Goals:**
- Paginación. Con el volumen previsto en el PRD, unas 200 tareas, la lista completa basta.
- Interfaz de reasignar responsable o editar el título. Solo existen por API.
- Refresco automático, control de concurrencia optimista (versión o ETag) y orden de la lista.

## Decisions

### D1. Tabla `tasks` con estado como enum y FK al responsable

Migración nueva con las columnas `id`, `title` (`string(255)`, no nula) y `status`. `status` es un `table.enum('status', ['pending', 'in_progress', 'done'])` no nulo con `default 'pending'`; en SQLite se traduce a un CHECK. Completan la tabla `assignee_id` (entero, FK a `users.id`, no nula, `onDelete('CASCADE')`), `created_at` y `updated_at`.

- **Por qué un enum también en la BD.** El conjunto cerrado se protege en dos capas: la validación da el `422` y el CHECK impide valores basura si alguien escribe por otra vía.
- **Por qué `CASCADE`.** Hoy no se pueden borrar usuarios, así que la elección no tiene efecto observable. Se usa `CASCADE` por coherencia con `auth_access_tokens`. Alternativa descartada: `RESTRICT`, que sería preferible si algún día se borran usuarios, pero esa decisión pertenece a esa historia.
- **No se guarda `created_by`.** Hoy creador y responsable inicial coinciden, y ninguna historia del alcance necesita distinguirlos. Añadirlo «por si acaso» sería un dato sin consumidor.
- **No hay columna de vencimiento**, por la restricción 1.

Tras `node ace migration:run`, el modelo `Task` extiende `TaskSchema` (generado) y solo declara `@belongsTo(() => User, { foreignKey: 'assigneeId' }) declare assignee`.

### D2. Rutas: tres, dentro del grupo autenticado

```
GET    /api/v1/tasks       → TasksController.index
POST   /api/v1/tasks       → TasksController.store
PATCH  /api/v1/tasks/:id   → TasksController.update
```

- Las rutas se declaran a mano con `router.get/post/patch`, no con `router.resource()`, para que no aparezcan `show` ni `destroy`, que la restricción 2 prohíbe.
- `:id` lleva el matcher numérico, así que un identificador no numérico da 404 de ruta.
- Van en un grupo nuevo `.prefix('tasks')` con `.use(middleware.auth())`, que es el mismo patrón que el grupo `account`.
- Se usa `PATCH` y no `PUT` porque la actualización es parcial.

### D3. Respuestas

- `index`: `serialize(TaskTransformer.transform(tasks))`, con `Task.query().preload('assignee')` y **sin `orderBy`** (restricción 4). El orden resultante es el que devuelva SQLite. Se documenta como no garantizado.
- `store`: `response.status(201)` y después `serialize(...)`. Se usa 201 y no el 200 del signup porque es la semántica correcta de creación, y la spec de auth no obliga a mantener el 200 en otros recursos.
- `update`: `Task.findOrFail(params.id)`, que da 404 si no existe. Después `merge(payload)`, `save()`, `load('assignee')` y `serialize(...)`.
- **`TaskTransformer`**: `pick(['id', 'title', 'status'])`, más `assignee: AssigneeTransformer.transform(this.whenLoaded(this.resource.assignee))`. `AssigneeTransformer` hace `pick(['id', 'fullName'])`.
  - Se descarta reutilizar `UserTransformer`, porque expone el email, las iniciales y las fechas, justo lo que la nota de E3-1 pide no filtrar.
  - Tampoco se exponen `createdAt` ni `updatedAt` de la tarea: la lista no muestra fechas y no hay consumidor.

### D4. Validación (VineJS 4, `app/validators/task.ts`)

- Builder compartido `title = () => vine.string().trim().minLength(1).maxLength(255)`. El bodyparser ya recorta y convierte `""` en `null`; el `trim()` explícito deja la regla autocontenida.
- `createTaskValidator = vine.create({ title: title() })`. VineJS descarta las claves no declaradas, así que `status` y `assigneeId` enviados al crear se ignoran sin error, como pide la spec.
- `updateTaskValidator = vine.create({ title: title().optional(), status: vine.enum(TASK_STATUSES).optional(), assigneeId: vine.number().exists({ table: 'users', column: 'id' }).optional() })`.
  - Cuerpo vacío: es un no-op válido y devuelve 200 con la tarea tal cual. Se descarta exigir al menos un campo porque añadiría una regla ad hoc sin valor para ningún consumidor.
  - El controlador valida antes de tocar el modelo, así que un error en cualquier campo deja la tarea intacta.
- `TASK_STATUSES = ['pending', 'in_progress', 'done'] as const` vive en el modelo y lo comparten el validador y la migración. Así no se repite la lista.
- En `store`, el controlador fija `status: 'pending'` y `assigneeId: auth.user.id`. No confía en el default de la BD para que la respuesta 201 salga ya con el estado.

### D5. Frontend: cliente de API y tipos

- `lib/types.ts`:
  - `TaskStatus = 'pending' | 'in_progress' | 'done'`.
  - `Task = { id; title; status; assignee: { id; fullName: string | null } }`.
  - `TASK_STATUS_LABELS`, el mapa `pending → Pendiente`, `in_progress → En curso`, `done → Hecho`. Es la única traducción de identificador a texto.
- `lib/api.ts`: `listTasks(token)`, `createTask(token, title)` y `updateTask(token, id, patch)`, con el mismo `request()` existente.
- Mensajes del título. Se añade `title: 'el título'` a `FIELD_LABELS` y dos casos específicos en `translate()` para `field === 'title'`:
  - `required` da «Escribe un título para la tarea.».
  - `maxLength` da «El título no puede superar los 255 caracteres.».
  - Se descarta usar los mensajes genéricos, que darían «Falta rellenar el título.» y uno en minúscula inicial, por claridad. Los casos de auth no cambian.

### D6. Frontend: pantalla y estado

- **Rutas.**
  - Nueva `pages/tasks-page.tsx` en `/tasks`, dentro de `ProtectedRoute`.
  - `PublicOnlyRoute` y el comodín `*` pasan a redirigir a `/tasks`. Con eso, el login y el registro aterrizan en Tareas sin tocar las páginas de acceso.
  - Enlaces con `Link` de react-router: «Perfil» en la cabecera de Tareas y «Tareas» en la tarjeta de Perfil.
- **Estado local** con `useState` en la página: `tasks`, `status` (`loading | ready | error`) y `error`. Se descarta un contexto o una librería de datos: es la única pantalla que lo consume, y no se pueden añadir dependencias.
- **Formulario de creación**: un `Input` de título y un `Button` «Crear tarea».
  - Se reutiliza `useAuthForm(['title'])`, que da el reparto de errores entre el campo y el aviso general y el estado `isSubmitting`. El nombre del hook queda algo forzado; se acepta antes que duplicarlo.
  - Al recibir el 201, la tarea devuelta se **añade al final** del estado local y el campo se vacía. Añadir no es ordenar: no se introduce ningún criterio.
- **Filas**: una `Card` contenedora con una lista. Cada `li` muestra:
  - El título.
  - `assignee.fullName ?? 'Sin nombre'`.
  - Un grupo de tres `Button` «Pendiente», «En curso» y «Hecho», con `role="group"` y `aria-label`. El estado actual va con la variante `default` y `aria-pressed="true"`; los otros dos, con `outline`.
  - Se descarta un `<select>` nativo: oculta los destinos tras un clic extra y no casa con los componentes existentes. Se descarta también `npx shadcn add select`, porque añade una dependencia de Radix.
- **Cambio de estado optimista.**
  1. Se pinta el nuevo estado al instante.
  2. Se llama a `updateTask`.
  3. Si falla, se restaura el estado anterior de esa fila y se muestra el `ApiError.message` en un `Alert` de página.
  4. Si va bien, se reemplaza la fila con la respuesta del servidor.

  Mientras hay una petición en vuelo para una fila, sus botones se desactivan, lo que evita carreras de clics.
- **Estado vacío**: si `tasks.length === 0`, en lugar de la lista se muestra un texto que explica qué es la lista e invita a crear la primera tarea. El formulario está siempre visible encima.
- **Carga y error**: `FullScreenLoader` o un loader en línea mientras carga. Si falla, `Alert` con el mensaje y `Button` «Reintentar».
- **401 en estas llamadas**: se muestra el mensaje de sesión caducada en el aviso de la página. No se fuerza el cierre de sesión desde aquí, que exigiría ampliar el contexto de auth fuera del alcance. Al recargar, la rehidratación existente ya resuelve la sesión.

## Risks / Trade-offs

- **[Sin orden, la tarea recién creada puede «saltar» al recargar]** → En la sesión actual aparece al final. Tras recargar, sale donde la ponga SQLite, que en la práctica es por `id`, sin garantía. Se acepta, y queda anotado como PA-3 en el proposal.
- **[Gana la última escritura entre personas]** → `PATCH` parcial: dos personas que cambian campos distintos no se pisan, pero sí si cambian el mismo campo. Sin refresco automático (E3-2), cada una ve su versión hasta recargar. Se acepta en este change.
- **[Cambio a «Hecho» por error, a un clic]** → Las transiciones son libres, así que se deshace con otro clic. PA-7 sigue abierto.
- **[La reasignación y la edición del título solo existen por API]** → Sin consumidor en la web, nadie las prueba a mano. Mitigación: los escenarios de la spec las cubren y son verificables con `curl`.
- **[Responsable sin nombre: «Sin nombre» repetido en varias filas]** → No permite distinguir a dos personas sin nombre. Es la consecuencia aceptada de la restricción 6 (nunca el correo).
- **[`useAuthForm` usado fuera de auth]** → Acoplamiento de nombre. Se puede renombrar en un refactor posterior, sin cambios de comportamiento.

## Migration Plan

1. `node ace migration:run` crea `tasks` y regenera `database/schema.ts`. No hay datos que migrar.
2. Arrancar el dev server regenera `.adonisjs/server/controllers.ts` y el registro Tuyau. Se commitea el diff.
3. Rollback: `node ace migration:rollback` elimina la tabla y se revierte el commit del frontend. Auth no se ve afectado salvo por los destinos de redirección, que vuelven a `/profile`.
