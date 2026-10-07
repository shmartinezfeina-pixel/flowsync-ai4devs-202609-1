# Spec Delta

## ADDED Requirements

### Requirement: Fecha de vencimiento opcional

Una tarea SHALL poder tener una fecha de vencimiento, que es una fecha de calendario sin hora (`YYYY-MM-DD`), o no tener ninguna (`null`). Crear una tarea sin fecha SHALL ser el camino por defecto. Las tareas que ya existían SHALL quedar sin fecha.

#### Scenario: Tarea creada sin fecha

- **WHEN** un cliente crea una tarea enviando solo el título
- **THEN** la tarea nace con `dueDate` a `null` e `isOverdue` a `false`

#### Scenario: Tareas anteriores al cambio

- **WHEN** se pide la lista justo después de aplicar el cambio
- **THEN** todas las tareas que ya existían aparecen con `dueDate` a `null`

### Requirement: Regla de vencimiento

Una tarea SHALL estar vencida si y solo si se cumplen a la vez tres condiciones: tiene fecha de vencimiento, esa fecha es anterior al día de referencia y su estado no es `done`. Una fecha igual al día de referencia SHALL NOT contar como vencida.

#### Scenario: Vence hoy

- **WHEN** una tarea pendiente tiene como fecha el mismo día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Fecha de ayer

- **WHEN** una tarea pendiente tiene como fecha el día anterior al de referencia
- **THEN** `isOverdue` es `true`

#### Scenario: Fecha futura

- **WHEN** una tarea en curso tiene una fecha posterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Sin fecha

- **WHEN** una tarea pendiente, creada hace semanas, no tiene fecha
- **THEN** `isOverdue` es `false`

#### Scenario: Hecha con la fecha pasada

- **WHEN** una tarea en `done` tiene una fecha muy anterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Darla por hecha

- **WHEN** una tarea vencida pasa a `done`
- **THEN** la respuesta trae `isOverdue` a `false` y la misma `dueDate` que tenía

#### Scenario: Salir de hecha con la fecha pasada

- **WHEN** una tarea en `done` con fecha anterior al día de referencia vuelve a `pending`
- **THEN** `isOverdue` vuelve a ser `true`

### Requirement: Veredicto calculado en cada lectura

El sistema SHALL calcular `isOverdue` cada vez que devuelve una tarea, con el día de referencia de esa petición. SHALL NOT guardarlo ni depender de ningún proceso que marque tareas con el paso del tiempo. Si un cliente envía `isOverdue` al crear o actualizar, SHALL ignorarse.

#### Scenario: Vence sola al cambiar de día

- **WHEN** una tarea pendiente con fecha 2026-10-07 se pide con día de referencia 2026-10-07, y después, sin que nadie la modifique, con 2026-10-08
- **THEN** la primera respuesta trae `isOverdue` a `false` y la segunda a `true`

#### Scenario: El cliente intenta fijar el veredicto

- **WHEN** un cliente actualiza una tarea sin fecha enviando `isOverdue: true`
- **THEN** la respuesta trae `isOverdue` a `false` y la tarea no cambia por ello

### Requirement: Día de referencia de quien mira

El día de referencia SHALL ser la fecha que el cliente envía en la cabecera `X-Client-Date` con formato `YYYY-MM-DD`. Si la cabecera falta, SHALL usarse el día actual en UTC. Si la cabecera trae una fecha mal formada o inexistente, la operación SHALL responder `422` y SHALL NOT modificar nada.

#### Scenario: Dos husos, dos veredictos

- **WHEN** dos clientes piden la misma tarea pendiente con fecha 2026-10-07, uno con `X-Client-Date: 2026-10-08` y otro con `X-Client-Date: 2026-10-07`
- **THEN** el primero recibe `isOverdue` a `true` y el segundo a `false`

#### Scenario: Sin cabecera

- **WHEN** un cliente pide la lista sin `X-Client-Date`
- **THEN** cada `isOverdue` se calcula con el día actual en UTC

#### Scenario: Cabecera inválida

- **WHEN** un cliente pide la lista con `X-Client-Date: 2026-02-30`
- **THEN** recibe `422`

### Requirement: Lectura individual de una tarea

`GET /api/v1/tasks/:id` SHALL devolver `200` con la tarea dentro de `data`, con la misma forma que en la lista, sea quien sea su responsable. Si la tarea no existe, SHALL responder `404`. Exige sesión como el resto de operaciones de tareas.

#### Scenario: Abrir una tarea ajena

- **WHEN** una persona con sesión pide una tarea cuyo responsable es otra persona
- **THEN** recibe `200` con la tarea, su `dueDate` y su `isOverdue`

#### Scenario: Tarea inexistente

- **WHEN** una persona con sesión pide una tarea cuyo identificador no existe
- **THEN** recibe `404`

### Requirement: Poner, cambiar y quitar la fecha

Al crear y al actualizar, el sistema SHALL aceptar una `dueDate` válida, incluso anterior al día de referencia. Al actualizar, enviar `dueDate` a `null` o vacía SHALL quitar la fecha. Cambiar la fecha, el estado o el responsable SHALL NOT alterar los demás campos. Cualquiera con sesión SHALL poder cambiar la fecha de cualquier tarea.

#### Scenario: Poner una fecha

- **WHEN** una persona pone la fecha 2026-10-20 a una tarea sin fecha
- **THEN** la respuesta trae `dueDate` igual a «2026-10-20»

#### Scenario: Fecha que ya pasó

- **WHEN** una persona pone a una tarea pendiente una fecha anterior al día de referencia
- **THEN** la fecha se acepta y la respuesta trae `isOverdue` a `true`

#### Scenario: Crear con fecha pasada

- **WHEN** un cliente crea una tarea con título y una `dueDate` anterior al día de referencia
- **THEN** recibe `201` con la tarea ya vencida

#### Scenario: Quitar la fecha

- **WHEN** una persona envía `dueDate` a `null` o vacía a una tarea vencida
- **THEN** la tarea queda sin fecha y con `isOverdue` a `false`

#### Scenario: Aplazar la fecha

- **WHEN** una persona cambia la fecha de una tarea vencida a una posterior al día de referencia
- **THEN** la respuesta trae `isOverdue` a `false`

#### Scenario: Reasignar no toca la fecha

- **WHEN** una persona cambia el responsable de una tarea con fecha
- **THEN** la `dueDate` y el `isOverdue` de la tarea no cambian

### Requirement: Fecha inválida

Una `dueDate` que no sea una fecha real en formato `YYYY-MM-DD` SHALL rechazarse con `422` y un error sobre `dueDate`, y la tarea SHALL conservar la fecha que tuviera.

#### Scenario: Fecha imposible

- **WHEN** un cliente pone a una tarea con fecha 2026-10-20 la fecha «2026-02-30»
- **THEN** recibe `422` con un error sobre `dueDate` y la tarea sigue con 2026-10-20

#### Scenario: Formato con hora

- **WHEN** un cliente envía `dueDate` como «2026-10-20T10:00:00Z»
- **THEN** recibe `422` con un error sobre `dueDate`

### Requirement: Pantalla de una tarea

La web SHALL tener una pantalla por tarea, solo accesible con sesión, a la que se llega pulsando su título en la lista. SHALL mostrar el título, el nombre del responsable (o «Sin nombre»), el estado, el campo de fecha de vencimiento y un enlace para volver a la lista. Título, responsable y estado SHALL mostrarse sin poder editarse en esta pantalla.

#### Scenario: Abrir desde la lista

- **WHEN** una persona pulsa el título «Revisar el PRD» en la lista
- **THEN** ve la pantalla de esa tarea con su título, su responsable, su estado y el campo de fecha

#### Scenario: Tarea que no existe

- **WHEN** una persona abre la pantalla de una tarea que no existe
- **THEN** ve el aviso «Esta tarea no existe.» y el enlace para volver a la lista

### Requirement: Editar la fecha desde la pantalla de una tarea

La fecha SHALL guardarse sola al salir del campo, sin botón de guardar, y el resultado SHALL verse al instante. Un botón «Quitar fecha» SHALL quitarla sin confirmación. Una fecha incompleta o inválida SHALL NOT guardarse: SHALL conservarse la anterior y mostrarse bajo el campo «Introduce una fecha completa y válida.».

#### Scenario: Poner la fecha

- **WHEN** una persona escribe una fecha en una tarea sin fecha y sale del campo
- **THEN** la fecha queda guardada y la pantalla la refleja sin recargar

#### Scenario: Quitar sin confirmar

- **WHEN** una persona pulsa «Quitar fecha»
- **THEN** la fecha desaparece al momento, sin ningún diálogo, y la señal de vencida, si estaba, también

#### Scenario: Fecha incompleta

- **WHEN** una persona deja el campo con una fecha a medio escribir y sale de él
- **THEN** ve «Introduce una fecha completa y válida.» bajo el campo y la tarea conserva la fecha anterior

#### Scenario: Al volver a la lista ya está guardado

- **WHEN** una persona cambia la fecha y pulsa «Volver a la lista»
- **THEN** al abrir de nuevo la tarea, la fecha nueva sigue ahí

### Requirement: Señal de tarea vencida

La pantalla de una tarea vencida SHALL mostrar una señal propia con icono y el texto «Vencida», que no dependa solo del color, sin obligar a comparar la fecha con hoy. Una tarea no vencida, o sin fecha, SHALL NOT mostrar ninguna señal, aviso ni recordatorio.

#### Scenario: Abrir una tarea vencida

- **WHEN** una persona abre una tarea pendiente cuya fecha es anterior a su día
- **THEN** ve la señal «Vencida» junto a la fecha

#### Scenario: Vence hoy

- **WHEN** una persona abre una tarea pendiente cuya fecha es su día de hoy
- **THEN** no ve la señal «Vencida»

#### Scenario: Sin fecha no se penaliza

- **WHEN** una persona abre una tarea sin fecha
- **THEN** ve el campo vacío y ninguna señal, aviso ni indicación de que le falte algo

#### Scenario: Poner una fecha pasada

- **WHEN** una persona pone una fecha anterior a su día a una tarea pendiente
- **THEN** la señal «Vencida» aparece en cuanto se guarda

### Requirement: Operaciones sobre tareas

La API de tareas SHALL ofrecer exactamente cuatro operaciones: listar todas las tareas (`GET /api/v1/tasks`), leer una (`GET /api/v1/tasks/:id`), crear una (`POST /api/v1/tasks`) y actualizar una (`PATCH /api/v1/tasks/:id`). SHALL NOT ofrecer borrado ni operaciones de equipo.

#### Scenario: Hay lectura individual

- **WHEN** un cliente con sesión pide `GET /api/v1/tasks/1` y la tarea existe
- **THEN** recibe `200` con esa tarea

#### Scenario: No hay borrado

- **WHEN** un cliente con sesión envía `DELETE /api/v1/tasks/1`
- **THEN** recibe `404` y la tarea sigue existiendo

## MODIFIED Requirements

### Requirement: Datos de una tarea en la API

Cada vez que la API devuelva una tarea, SHALL incluir exactamente su identificador, su título, su estado, su responsable, su fecha de vencimiento (`dueDate`, `YYYY-MM-DD` o `null`) y su veredicto de vencimiento (`isOverdue`, booleano). Del responsable SHALL incluir solo su identificador y su nombre completo (o `null` si no tiene). La API SHALL NOT devolver el email ni ningún otro dato de cuenta del responsable.

#### Scenario: Forma de una tarea

- **WHEN** la API devuelve una tarea sin fecha cuyo responsable se llama «Ada Lovelace»
- **THEN** la tarea tiene la forma `{ "id": …, "title": "…", "status": "pending", "dueDate": null, "isOverdue": false, "assignee": { "id": …, "fullName": "Ada Lovelace" } }` y nada más

#### Scenario: Responsable sin nombre

- **WHEN** la API devuelve una tarea cuyo responsable no tiene nombre
- **THEN** el responsable aparece con `fullName` a `null` y sin su email

### Requirement: Crear una tarea con solo el título

`POST /api/v1/tasks` SHALL crear una tarea a partir de su título y, opcionalmente, de una `dueDate`, y responder `201` con la tarea creada dentro de `data`. La tarea SHALL nacer en estado `pending` y con quien la crea como responsable. Cualquier otro campo enviado (estado, responsable, `isOverdue`) SHALL ignorarse.

#### Scenario: Crear con título

- **WHEN** una persona con sesión crea una tarea con el título «Preparar la demo»
- **THEN** recibe `201` con una tarea titulada «Preparar la demo», en estado `pending`, sin fecha y con ella misma como responsable

#### Scenario: Estado y responsable enviados al crear

- **WHEN** una persona crea una tarea enviando, además del título, el estado `done` y otro responsable
- **THEN** la tarea se crea igualmente en `pending` y con ella como responsable

#### Scenario: La tarea creada aparece en la lista

- **WHEN** una persona crea una tarea y después se pide la lista
- **THEN** la tarea nueva está en la lista

### Requirement: Actualizar una tarea

`PATCH /api/v1/tasks/:id` SHALL permitir cambiar el título, el estado, el responsable y/o la fecha de vencimiento de cualquier tarea, sea quien sea su responsable, y responder `200` con la tarea actualizada dentro de `data`. Los campos no enviados SHALL quedar como estaban. Desde cualquier estado SHALL poderse pasar a cualquiera de los otros dos.

#### Scenario: Cambiar el estado de una tarea ajena

- **WHEN** una persona cambia a `in_progress` el estado de una tarea cuyo responsable es otra persona
- **THEN** recibe `200` con la tarea en `in_progress`, sin ningún permiso especial

#### Scenario: Volver desde hecho

- **WHEN** una persona cambia a `pending` una tarea que estaba en `done`
- **THEN** la tarea queda en `pending`

#### Scenario: Reasignar

- **WHEN** una persona actualiza una tarea indicando como responsable a otra persona registrada
- **THEN** la tarea pasa a tener a esa persona como responsable, y su estado, su título y su fecha no cambian

#### Scenario: Cambiar el título

- **WHEN** una persona actualiza el título de una tarea a «Demo del viernes»
- **THEN** la tarea pasa a llamarse «Demo del viernes», con el mismo estado, responsable y fecha

### Requirement: Actualización inválida

Al actualizar, un título, estado o responsable enviado vacío o en blanco SHALL rechazarse, nunca ignorarse; una `dueDate` vacía, en cambio, quita la fecha. El título SHALL seguir las mismas reglas que al crear. SHALL rechazarse un estado fuera de los tres valores o un responsable que no sea una persona registrada. En esos casos SHALL responder `422` y SHALL NOT modificar ningún campo. Si los datos son válidos pero la tarea no existe, SHALL responder `404`.

#### Scenario: Responsable inexistente

- **WHEN** un cliente actualiza una tarea con un responsable que no corresponde a ninguna persona registrada
- **THEN** recibe `422` con un error sobre el responsable y la tarea no cambia

#### Scenario: Error en un campo bloquea los demás

- **WHEN** un cliente envía a la vez un estado válido y un título en blanco
- **THEN** recibe `422` y ni el estado ni el título cambian

#### Scenario: Título en blanco al actualizar

- **WHEN** un cliente actualiza una tarea enviando solo el título «   »
- **THEN** recibe `422` con un error sobre el título y la tarea conserva su título

#### Scenario: Estado vacío al actualizar

- **WHEN** un cliente actualiza una tarea enviando el estado vacío o `null`
- **THEN** recibe `422` con un error sobre el estado y la tarea no cambia

#### Scenario: Fecha vacía al actualizar

- **WHEN** un cliente actualiza una tarea con fecha enviando `dueDate` vacía
- **THEN** recibe `200` y la tarea queda sin fecha

#### Scenario: Tarea inexistente

- **WHEN** un cliente actualiza con datos válidos una tarea cuyo identificador no existe
- **THEN** recibe `404`

#### Scenario: Datos inválidos sobre una tarea inexistente

- **WHEN** un cliente envía un estado inválido a una tarea cuyo identificador no existe
- **THEN** recibe `422`, porque los datos se validan antes de buscar la tarea

### Requirement: Pantalla de la lista de tareas

La web SHALL tener una pantalla «Tareas», solo accesible con sesión, que muestre todas las tareas en una sola lista. Cada fila SHALL mostrar el título, el nombre del responsable y el estado («Pendiente», «En curso» o «Hecho»). El título SHALL enlazar a la pantalla de esa tarea. La lista SHALL NOT mostrar fechas, marcas de vencida, correos, identificadores ni señales de presencia.

#### Scenario: Quién está en qué de un vistazo

- **WHEN** una persona abre Tareas con tareas repartidas entre varias personas
- **THEN** cada fila le dice el título, quién la lleva y en qué estado está, sin abrir ninguna tarea

#### Scenario: Estado en castellano

- **WHEN** una tarea está en `in_progress`
- **THEN** su fila la muestra como «En curso»

#### Scenario: Sin vista «mis tareas»

- **WHEN** una persona busca otras vistas de tareas en la web
- **THEN** solo existe la lista del equipo; no hay vista «mis tareas» ni filtro por persona

#### Scenario: Sin presencia

- **WHEN** varias personas usan la aplicación a la vez
- **THEN** la lista no indica quién está conectado ni la actividad de nadie

#### Scenario: La fecha no asoma en la lista

- **WHEN** hay tareas con fecha, algunas vencidas, y una persona mira la lista
- **THEN** no ve ninguna fecha ni marca de vencida en ninguna fila

## REMOVED Requirements

### Requirement: Solo tres operaciones sobre tareas

**Reason**: La historia FS-118 necesita abrir una tarea, así que la API añade la lectura individual (`GET /api/v1/tasks/:id`) y deja de tener exactamente tres operaciones.
**Migration**: Lo sustituye el requisito «Operaciones sobre tareas», que enumera las cuatro operaciones y mantiene la prohibición de borrar y de operaciones de equipo.
