# Tasks

> Sin tests por decisión del change: cada tarea se verifica con typecheck, lint, `curl` contra el backend local o comprobación manual en el navegador.

## 1. Modelo de datos (backend)

- [ ] 1.1 Crear con `node ace make:migration` la tabla `tasks`:
  - `title`: `string(255)`, no nulo.
  - `status`: `enum('pending','in_progress','done')`, no nulo, default `pending`.
  - `assignee_id`: FK a `users.id`, no nula, `CASCADE`.
  - `created_at` y `updated_at`.
  - Sin columna de vencimiento (design D1).

  Verificar que `node ace migration:run` pasa y que `database/schema.ts` contiene `TaskSchema` con esas columnas.
- [ ] 1.2 Crear `app/models/task.ts`, que extiende `TaskSchema` y declara la relación `assignee` (`belongsTo` User por `assigneeId`), más la constante exportada `TASK_STATUSES`. Verificar con `npm run typecheck` en `backend/`.

## 2. API de tareas (backend)

- [ ] 2.1 Crear `app/validators/task.ts` con `createTaskValidator` (solo `title`) y `updateTaskValidator` (`title`, `status` y `assigneeId` opcionales, con `vine.enum(TASK_STATUSES)` y `exists` sobre `users.id`), según design D4. Verificar con `npm run typecheck`.
- [ ] 2.2 Crear `app/transformers/task_transformer.ts` (`id`, `title`, `status`, `assignee`) y `assignee_transformer.ts` (`id`, `fullName`), según design D3. Verificar con `npm run typecheck`.
- [ ] 2.3 Crear `app/controllers/tasks_controller.ts`:
  - `index`: precarga `assignee` y no usa `orderBy`.
  - `store`: devuelve 201, `pending` y responsable igual al usuario autenticado.
  - `update`: `findOrFail`, valida antes de `merge` y precarga `assignee`.

  Verificar con `npm run typecheck`.
- [ ] 2.4 Registrar en `start/routes.ts` un grupo `tasks` con `middleware.auth()` y solo `GET /`, `POST /` y `PATCH /:id` (matcher numérico). Arrancar `npm run dev` para regenerar `.adonisjs/`. Verificar que `node ace list:routes` muestra exactamente esas tres rutas de tareas y ninguna `show` ni `destroy`.
- [ ] 2.5 Verificar la API con `curl` y un token de una cuenta de prueba, cubriendo los escenarios de `specs/tasks/spec.md`:
  - Acceso: 401 sin token. 404 en `GET /tasks/1` y en `DELETE /tasks/1`.
  - Creación: 201 con `pending` y el creador como responsable, ignorando el `status` o `assigneeId` enviados.
  - Validación del título: 422 con título vacío, con solo espacios y con 256 caracteres. Se acepta con 255.
  - Actualización correcta: 200 al cambiar el estado de una tarea ajena, al volver desde `done`, al reasignar y al cambiar el título.
  - Actualización inválida: 422 con estado `blocked` o `Hecho`, con un responsable inexistente, y con estado válido más título en blanco, en cuyo caso no cambia nada. 404 con un id inexistente.
  - Forma de la respuesta: el JSON del responsable no contiene `email`.
- [ ] 2.6 Ejecutar `npm run lint` y `npm run format` en `backend/`, y commitear el diff regenerado de `database/schema.ts` y `.adonisjs/`. Verificar que el lint sale limpio.

## 3. Cliente de API y tipos (frontend)

- [ ] 3.1 Añadir a `src/lib/types.ts` `TaskStatus`, `Task` (responsable con `id` y `fullName`) y `TASK_STATUS_LABELS` (`Pendiente` / `En curso` / `Hecho`). Verificar con `npm run build`.
- [ ] 3.2 Añadir a `src/lib/api.ts` `listTasks`, `createTask` y `updateTask` usando `request()`. Añadir también `title` a `FIELD_LABELS` y los mensajes específicos del título: «Escribe un título para la tarea.» y «El título no puede superar los 255 caracteres.», según design D5. Verificar con `npm run build` y comprobar que los mensajes de auth no cambian.

## 4. Pantalla de Tareas (frontend)

- [ ] 4.1 Crear `src/pages/tasks-page.tsx` con la carga inicial: loader, aviso de error con «Reintentar» y estado vacío que explica la lista e invita a crear la primera tarea. Verificar en el navegador:
  - Con la BD sin tareas se ve el estado vacío.
  - Con el backend parado se ve el aviso y «Reintentar» recupera la lista al arrancarlo.
- [ ] 4.2 Añadir el formulario de creación con un único `Input` de título y el botón «Crear tarea», reutilizando `useAuthForm(['title'])`. La tarea creada se añade al final de la lista y el campo se vacía. Verificar en el navegador:
  - Crear «Revisar el PRD» la muestra al momento con tu nombre (o «Sin nombre») y «Pendiente».
  - Vacío o solo espacios da «Escribe un título para la tarea.».
  - 256 caracteres da el aviso de longitud y el texto se conserva.
  - No hay ningún control de responsable, estado ni fecha.
- [ ] 4.3 Pintar cada fila con:
  - El título.
  - `fullName ?? 'Sin nombre'`.
  - El grupo de tres `Button` de estado, con el actual destacado y `aria-pressed`.

  Verificar en el navegador que no aparecen correos, ids, fechas ni marcas de vencida.
- [ ] 4.4 Implementar el cambio de estado optimista con rollback y aviso de error, desactivando los botones de la fila mientras hay petición en vuelo (design D6). Verificar en el navegador:
  - Pulsar «En curso» cambia la fila al momento, sin diálogo, y persiste al recargar.
  - Funciona igual en una tarea de otra persona.
  - Con el backend parado, la fila vuelve a su estado y aparece el aviso de servidor inaccesible.

## 5. Navegación (frontend)

- [ ] 5.1 Registrar `/tasks` dentro de `ProtectedRoute` en `app-routes.tsx` y cambiar el comodín `*` y `PublicOnlyRoute` para que redirijan a `/tasks`. Verificar en el navegador:
  - Login y registro aterrizan en Tareas.
  - Una dirección desconocida lleva a Tareas con sesión y al login sin ella.
  - Abrir `/login` con sesión lleva a Tareas.
- [ ] 5.2 Añadir el enlace «Perfil» en la cabecera de Tareas y «Tareas» en la tarjeta de Perfil. Verificar en el navegador que se navega en ambos sentidos.
- [ ] 5.3 Ejecutar `npm run lint` y `npm run build` en `frontend/`. Verificar que ambos salen limpios.

## 6. Verificación de extremo a extremo

- [ ] 6.1 Con dos cuentas en dos navegadores, una de ellas sin nombre, verificar:
  - Las dos ven el mismo conjunto de tareas tras recargar.
  - Una tarea creada por B aparece en la lista de A tras recargar, con «Sin nombre» si B no tiene nombre.
  - A puede cambiar el estado de la tarea de B.
- [ ] 6.2 Ejecutar `openspec validate add-task-list --strict` y verificar que sale válido.

## Workflow follow-up

- Abrir el PR, pasar la revisión adversarial y archivar el change cuando esté fusionado.
- Tras archivar, comprobar que `openspec/specs/tasks/spec.md` existe y que `openspec/specs/auth/spec.md` refleja la nueva navegación.
