# Tasks

> Sin tests por decisión del change: cada tarea se verifica con typecheck, lint, `curl` contra el backend local o comprobación manual en el navegador.

## 1. Fecha de vencimiento y regla (backend)

- [x] 1.1 Crear con `node ace make:migration` una migración que añada a `tasks` la columna `due_date` (`date`, nullable), con un `down` que la elimine (design D1). Verificar:
  - `node ace migration:run` pasa sobre la BD con tareas existentes.
  - `database/schema.ts` tiene `@column.date() declare dueDate: DateTime | null` en `TaskSchema`.
  - `GET /api/v1/tasks` sigue respondiendo.
- [x] 1.2 Añadir al modelo `Task` el método `isOverdueOn(today: string): boolean`, que devuelve `false` si `!this.dueDate` (nulo o `undefined` tras `create`) o si el estado es `done`, y si no compara cadenas ISO con `<` estricto (design D2). Verificar con `npm run typecheck`.
- [x] 1.3 Crear `app/services/reference_day.ts` con `referenceDay(request)`, según design D3:
  - Sin cabecera, devuelve el día UTC.
  - Con `YYYY-MM-DD` válido, lo devuelve.
  - Si no, lanza `E_VALIDATION_ERROR` sobre `X-Client-Date`.

  Verificar con `npm run typecheck`.

## 2. API de la fecha (backend)

- [x] 2.1 Añadir `dueDate` a `TaskTransformer` (`toISODate()` o `null`) e `isOverdue` (`isOverdueOn(today)`), recibiendo `today` como argumento del constructor (design D4). Verificar con `npm run typecheck`.
- [x] 2.2 Añadir a `createTaskValidator` y `updateTaskValidator` el campo `dueDate: vine.date({ formats: ['YYYY-MM-DD'] }).nullable().optional()` (design D5). Verificar con `npm run typecheck`.
- [x] 2.3 Actualizar `TasksController` (design D3, D5 y D6):
  - Todas las acciones resuelven `referenceDay` primero y pasan `today` al transformer.
  - `store` acepta `dueDate`.
  - `update` asigna el payload validado con `merge` (un `dueDate: null` quita la fecha) y sigue rechazando los `null` de `title`, `status` y `assigneeId`.
  - Nueva acción `show` con `preload` y `firstOrFail`.

  Verificar con `npm run typecheck`.
- [x] 2.4 Registrar `GET /api/v1/tasks/:id` (matcher numérico) en el grupo `tasks` y regenerar `.adonisjs/` con el dev server. Verificar que `node ace list:routes` muestra exactamente cuatro rutas de tareas y ninguna `destroy`.
- [x] 2.5 Verificar con `curl` los escenarios de `specs/tasks/spec.md`:
  - **Forma**: `dueDate: null` e `isOverdue: false` en las tareas existentes, y sin `email`.
  - **Lectura individual**: 200, y 404 si no existe. `DELETE` sigue dando 404.
  - **Crear**: sin fecha da 201 (no 500) con `dueDate: null`. Con una fecha pasada da 201 con `isOverdue: true`. Si se envía `isOverdue: true` sin fecha, se ignora.
  - **Veredicto del cliente**: enviar `isOverdue: false` al actualizar una tarea vencida devuelve igualmente `true`.
  - **Tarea ajena**: poner fecha a una tarea de otra persona da 200.
  - **Ida y vuelta**: enviar `2026-10-20` devuelve exactamente `2026-10-20`.
  - **Regla**, con `X-Client-Date`:
    - Vence hoy da `false`; ayer da `true`; futura da `false`.
    - En `done` con la fecha pasada da `false`, y la fecha se conserva.
    - Volver de `done` a `pending` da `true`.
    - Aplazar la fecha da `false`.
    - Reasignar no cambia `dueDate` ni `isOverdue`.
  - **Quitar**: `dueDate: null` y `dueDate: ""` dan 200 sin fecha.
  - **Fecha inválida**: `2026-02-30` y `2026-10-20T10:00:00Z` dan 422 sobre `dueDate`, y la fecha anterior se conserva.
  - **Día de referencia**: la misma tarea con `X-Client-Date` `2026-10-07` y `2026-10-08` da veredictos distintos. Sin cabecera se usa el día UTC. `X-Client-Date: 2026-02-30` en la lista da 422. `X-Client-Date: 07/10/2026` en un `PATCH` de estado da 422 y el estado no cambia.
- [x] 2.6 Ejecutar `npm run lint`, `npm run format` y `npm run typecheck` en `backend/` y commitear el diff regenerado de `database/schema.ts` y `.adonisjs/`. Revertir cambios de formato ajenos al change, como el salto de línea final de `package.json`. Verificar que todo sale limpio.

## 3. Cliente de API y tipos (frontend)

- [ ] 3.1 En `src/lib/types.ts`, añadir `dueDate: string | null` e `isOverdue: boolean` a `Task`, y `dueDate?: string | null` a `TaskPatch`. Verificar con `npm run build`.
- [ ] 3.2 En `src/lib/api.ts` (design D7):
  - `request()` envía siempre `X-Client-Date` con la fecha local del navegador.
  - Nueva función `getTask(token, id)`.
  - `translate()` da «Introduce una fecha completa y válida.» para cualquier error en `dueDate`, y «La fecha de tu dispositivo no es válida. Revisa el reloj del sistema.» para `X-Client-Date`.

  Verificar con `npm run build`, y en la pestaña de red del navegador que las peticiones llevan la cabecera con la fecha local.

## 4. Pantalla de una tarea (frontend)

- [ ] 4.1 Crear `src/pages/task-page.tsx` con la carga de la tarea: loader, «Esta tarea no existe.» en 404, aviso con «Reintentar» en otros fallos, y el enlace «Volver a la lista». Debe mostrar título, responsable (o «Sin nombre») y estado como texto no editable (design D8). Verificar en el navegador:
  - Abrir una tarea existente muestra sus datos.
  - Abrir `/tasks/99999` muestra el aviso.
- [ ] 4.2 Añadir el campo «Fecha de vencimiento (opcional)» (`Input type="date"`), sin botón de guardar, según design D8:
  - Guardado con espera de 500 ms en `change` cuando la fecha es completa y el año es ≥ 1000; inmediato al salir del campo y al desmontar la página.
  - Peticiones serializadas, solo una en vuelo.
  - «Quitar fecha» sin confirmación, con `preventDefault` en `mousedown`.
  - Una fecha incompleta muestra el error por campo y restaura la anterior.
  - Tras guardar, la tarea se sustituye por la respuesta del servidor.
  - Sin saltos de maquetación: la señal va en línea y el hueco del error tiene altura reservada.

  Verificar en el navegador:
  - Elegir un día en el calendario lo guarda sin salir del campo.
  - Teclear una fecha y salir la guarda.
  - Cambiar la fecha y pulsar Atrás inmediatamente la conserva al reabrir la tarea.
  - «Quitar fecha» la quita sin diálogo, también con una fecha a medio escribir.
  - Una fecha a medio escribir, al salir, muestra «Introduce una fecha completa y válida.» y conserva la anterior.
- [ ] 4.3 Añadir la señal «Vencida» (icono y texto, asociada al campo) solo cuando `isOverdue` es `true`. Verificar en el navegador:
  - Una fecha de ayer en una tarea pendiente muestra «Vencida» al guardarse.
  - Una fecha de hoy no la muestra.
  - Una tarea sin fecha no muestra ninguna señal ni aviso.
  - Marcar la tarea «Hecho» desde la lista y volver a abrirla quita la señal.

## 5. Navegación y lista (frontend)

- [ ] 5.1 Registrar `/tasks/:id` dentro de `ProtectedRoute` en `app-routes.tsx` y convertir el título de cada fila de la lista en un `Link` a esa ruta. Verificar en el navegador:
  - Pulsar un título abre su tarea y «Volver a la lista» regresa.
  - Sin sesión, `/tasks/1` lleva al login.
  - La lista sigue sin mostrar fechas, marcas de vencida ni avisos por no tener fecha, aunque haya tareas vencidas.
  - El formulario de creación sigue pidiendo solo el título.
- [ ] 5.2 Ejecutar `npm run lint` y `npm run build` en `frontend/`. Verificar que ambos salen limpios.

## 6. Verificación de extremo a extremo

- [ ] 6.1 Con dos navegadores, uno con el reloj o la zona horaria del sistema en otro día, verificar que la misma tarea con fecha de ayer para uno y de hoy para el otro sale «Vencida» solo para el primero.
- [ ] 6.2 Ejecutar `npx -y @fission-ai/openspec@latest validate add-task-due-date --strict` y verificar que sale válido.

## Workflow follow-up

- Abrir el PR, pasar la revisión adversarial y archivar el change cuando esté fusionado.
- Tras archivar, comprobar que `openspec/specs/tasks/spec.md` tiene el requisito «Operaciones sobre tareas», que ya no tiene «Solo tres operaciones sobre tareas», y que `auth` refleja la nueva pantalla.
