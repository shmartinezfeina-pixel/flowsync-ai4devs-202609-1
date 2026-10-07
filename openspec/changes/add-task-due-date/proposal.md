# Proposal

## Why

Hoy una tarea no puede llevar plazo, así que nadie sabe qué se ha pasado de fecha hasta que es tarde. FS-118 (RF-13, RF-14 y RF-15) pide tres cosas:
- Poder poner o quitar una fecha de vencimiento al abrir una tarea.
- Que el sistema diga explícitamente si está vencida.
- Que la lista principal no se llene de fechas ni de marcas.

## What Changes

- **Fecha de vencimiento opcional en la tarea**:
  - Es una fecha de calendario sin hora (`dueDate`, `YYYY-MM-DD` o `null`).
  - Crear sin fecha sigue siendo el camino por defecto.
  - La API la acepta al crear y al actualizar, incluidas fechas anteriores a hoy.
  - Se quita enviándola explícitamente vacía (`null` o `""`).
- **Veredicto `isOverdue` calculado por el backend en cada lectura**:
  - Es `true` solo si la tarea tiene fecha, esa fecha es anterior al día de referencia y el estado no es `done`.
  - No se guarda en ninguna columna ni lo actualiza ningún proceso programado.
  - Si el cliente lo envía, se ignora.
- **Día de referencia de quien mira**:
  - El cliente envía su fecha local en la cabecera `X-Client-Date: YYYY-MM-DD`.
  - Si falta, el servidor usa el día UTC. Si está mal formada, responde `422`.
  - Así, dos personas en husos distintos pueden obtener veredictos distintos, y ambos son correctos.
- **Nueva operación `GET /api/v1/tasks/:id`**: es la lectura individual mínima que necesita «abrir la tarea». La API pasa de tres a cuatro operaciones. Sigue sin haber borrado ni endpoints de equipo.
- **Toda representación de tarea gana `dueDate` e `isOverdue`**: la lista, la lectura individual, la creación y la actualización.
- **Pantalla mínima de una tarea en `/tasks/:id`**, a la que se llega desde el título de cada fila:
  - Muestra título, responsable y estado, sin poder editarlos.
  - Un campo de fecha que se guarda solo, sin botón de guardar, y un «Quitar fecha» sin confirmación.
  - La señal «Vencida», con icono y texto, no solo color.
  - Un enlace de vuelta a la lista.
- **La lista no cambia lo que muestra**: título, responsable y estado, sin fechas ni marcas de vencida. El único cambio es que el título enlaza a la pantalla de la tarea.

Fuera de alcance:
- La pantalla de detalle completa: editar el título, el estado o el responsable desde ella.
- Notificaciones, recordatorios y recurrencia.
- Ordenar o filtrar por fecha.
- Tests de cualquier tipo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tasks`: añade la fecha de vencimiento, la regla de vencimiento, el día de referencia, la lectura individual y la pantalla mínima de una tarea.
  - Modifica la forma de una tarea, las operaciones disponibles, la creación, la actualización y la validación al actualizar.
  - En la lista, el título pasa a enlazar a la tarea.
- `auth`: la navegación con sesión incluye ahora la pantalla de una tarea, que también exige sesión.

## Puntos abiertos

- **Pantalla de detalle (PA-6).** Este change crea solo la superficie mínima: leer la tarea y editar su fecha. Editar el resto de campos desde ahí queda para la historia del detalle.
- **Día de referencia sin cabecera.** Un cliente que no envía `X-Client-Date` recibe el veredicto según el día UTC. Para quien esté lejos de UTC puede diferir un día de su calendario cerca de la medianoche.
- **Reloj del cliente equivocado.** El servidor confía en el día que dice el cliente. Un reloj mal puesto solo afecta a lo que ve esa persona, nunca a los datos guardados.
- **Volver de «Hecho» con la fecha pasada (PA-7).** Por la regla, la tarea vuelve a estar vencida en cuanto sale de `done`. No hace falta nada especial, pero el producto no lo ha decidido explícitamente.
- **Cambios simultáneos de fecha (PA-8).** Gana la última escritura, como en el resto de campos.

## Impact

- **Backend**:
  - Migración que añade `due_date` (date, nullable) a `tasks`. Las tareas existentes quedan sin fecha.
  - Regla de vencimiento en el dominio de la tarea y lectura del día de referencia desde la petición.
  - Validadores, transformer y controlador actualizados, y una ruta nueva (`GET /tasks/:id`).
  - Regeneración de `database/schema.ts` y `.adonisjs/`.
- **Frontend**:
  - El cliente de API envía `X-Client-Date` y gana `getTask` y el campo `dueDate` en `updateTask`.
  - Tipos de tarea ampliados.
  - Nueva página `/tasks/:id`.
  - El título de la fila de la lista enlaza a esa página.
- **Sin dependencias nuevas.** La fecha se edita con el `Input` existente en modo `type="date"`.
