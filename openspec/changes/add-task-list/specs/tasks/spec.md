# Spec Delta

## Purpose

Dar al equipo una sola lista compartida de tareas, la misma para todos, en la que cada tarea dice de un vistazo su título, quién la lleva y en qué estado está. Se crea con solo un título y su estado se cambia sin salir de la lista.

## ADDED Requirements

### Requirement: Datos de una tarea en la API

Cada vez que la API devuelva una tarea, SHALL incluir exactamente su identificador, su título, su estado y su responsable. Del responsable SHALL incluir solo su identificador y su nombre completo (o `null` si no tiene). La API SHALL NOT devolver el email ni ningún otro dato de cuenta del responsable, y la tarea SHALL NOT tener fecha de vencimiento.

#### Scenario: Forma de una tarea

- **WHEN** la API devuelve una tarea cuyo responsable se llama «Ada Lovelace»
- **THEN** la tarea tiene la forma `{ "id": …, "title": "…", "status": "pending", "assignee": { "id": …, "fullName": "Ada Lovelace" } }` y nada más

#### Scenario: Responsable sin nombre

- **WHEN** la API devuelve una tarea cuyo responsable no tiene nombre
- **THEN** el responsable aparece con `fullName` a `null` y sin su email

### Requirement: Tres estados cerrados

El estado de una tarea SHALL ser siempre exactamente uno de `pending`, `in_progress` o `done`. El sistema SHALL rechazar con `422` cualquier otro valor, incluidos los nombres en castellano. No SHALL existir ninguna forma de añadir, renombrar ni eliminar estados.

#### Scenario: Estado desconocido

- **WHEN** un cliente actualiza una tarea con el estado `blocked`
- **THEN** recibe `422` con un error sobre el estado, y la tarea no cambia

#### Scenario: Nombre en castellano como estado

- **WHEN** un cliente actualiza una tarea con el estado `Hecho`
- **THEN** recibe `422`, porque solo valen `pending`, `in_progress` y `done`

### Requirement: Acceso a la API de tareas solo con sesión

Todas las operaciones de tareas SHALL exigir un token de sesión válido. Sin él, SHALL responder `401` y SHALL NOT devolver ni modificar ninguna tarea.

#### Scenario: Listar sin sesión

- **WHEN** un cliente pide la lista de tareas sin token
- **THEN** recibe `401` y ninguna tarea

#### Scenario: Crear sin sesión

- **WHEN** un cliente intenta crear una tarea sin token
- **THEN** recibe `401` y no se crea ninguna tarea

### Requirement: Solo tres operaciones sobre tareas

La API de tareas SHALL ofrecer exactamente tres operaciones: listar todas las tareas (`GET /api/v1/tasks`), crear una (`POST /api/v1/tasks`) y actualizar una (`PATCH /api/v1/tasks/:id`). SHALL NOT ofrecer lectura individual de una tarea, ni borrado, ni operaciones de equipo.

#### Scenario: No hay lectura individual

- **WHEN** un cliente con sesión pide `GET /api/v1/tasks/1`
- **THEN** recibe `404`

#### Scenario: No hay borrado

- **WHEN** un cliente con sesión envía `DELETE /api/v1/tasks/1`
- **THEN** recibe `404` y la tarea sigue existiendo

### Requirement: Listar todas las tareas

`GET /api/v1/tasks` SHALL responder `200` con todas las tareas del espacio dentro de `data`, sin ningún filtro por persona. El resultado SHALL ser el mismo sea quien sea quien lo pida. Listar SHALL NOT modificar ninguna tarea. El sistema no garantiza ningún orden concreto.

#### Scenario: Dos personas ven lo mismo

- **WHEN** dos personas distintas piden la lista sin que nadie haya cambiado nada entre medias
- **THEN** reciben exactamente el mismo conjunto de tareas

#### Scenario: Tarea ajena visible

- **WHEN** otra persona crea una tarea y yo pido la lista
- **THEN** esa tarea aparece en mi lista con su responsable

#### Scenario: Espacio sin tareas

- **WHEN** se pide la lista y no hay ninguna tarea creada
- **THEN** la respuesta es `200` con `data` como lista vacía

#### Scenario: Mirar no cambia nada

- **WHEN** se pide la lista varias veces seguidas
- **THEN** ninguna tarea cambia de título, estado ni responsable

### Requirement: Crear una tarea con solo el título

`POST /api/v1/tasks` SHALL crear una tarea a partir únicamente de su título y responder `201` con la tarea creada dentro de `data`. La tarea SHALL nacer en estado `pending` y con quien la crea como responsable. Cualquier otro campo enviado (estado, responsable, fechas) SHALL ignorarse.

#### Scenario: Crear con título

- **WHEN** una persona con sesión crea una tarea con el título «Preparar la demo»
- **THEN** recibe `201` con una tarea titulada «Preparar la demo», en estado `pending` y con ella misma como responsable

#### Scenario: Estado y responsable enviados al crear

- **WHEN** una persona crea una tarea enviando, además del título, el estado `done` y otro responsable
- **THEN** la tarea se crea igualmente en `pending` y con ella como responsable

#### Scenario: La tarea creada aparece en la lista

- **WHEN** una persona crea una tarea y después se pide la lista
- **THEN** la tarea nueva está en la lista

### Requirement: Título obligatorio y acotado

El título SHALL ser obligatorio. El sistema SHALL quitar los espacios de los extremos y tratar como ausente un título que queda vacío. Un título de más de 255 caracteres tras el recorte SHALL rechazarse. En todos estos casos SHALL responder `422` con un error sobre el título y SHALL NOT crear ni modificar la tarea; nunca SHALL guardar una versión recortada.

#### Scenario: Sin título

- **WHEN** un cliente crea una tarea sin título
- **THEN** recibe `422` con un error `required` sobre el título y no se crea ninguna tarea

#### Scenario: Título solo con espacios

- **WHEN** un cliente crea una tarea con el título «    »
- **THEN** recibe `422` igual que si no hubiera título, y la lista no gana ninguna fila

#### Scenario: Título demasiado largo

- **WHEN** un cliente crea una tarea con un título de 256 caracteres
- **THEN** recibe `422` con un error de longitud máxima sobre el título y no se guarda nada

#### Scenario: Título en el límite

- **WHEN** un cliente crea una tarea con un título de exactamente 255 caracteres
- **THEN** la tarea se crea con el título completo

### Requirement: Actualizar una tarea

`PATCH /api/v1/tasks/:id` SHALL permitir cambiar el título, el estado y/o el responsable de cualquier tarea, sea quien sea su responsable, y responder `200` con la tarea actualizada dentro de `data`. Los campos no enviados SHALL quedar como estaban. Desde cualquier estado SHALL poderse pasar a cualquiera de los otros dos.

#### Scenario: Cambiar el estado de una tarea ajena

- **WHEN** una persona cambia a `in_progress` el estado de una tarea cuyo responsable es otra persona
- **THEN** recibe `200` con la tarea en `in_progress`, sin ningún permiso especial

#### Scenario: Volver desde hecho

- **WHEN** una persona cambia a `pending` una tarea que estaba en `done`
- **THEN** la tarea queda en `pending`

#### Scenario: Reasignar

- **WHEN** una persona actualiza una tarea indicando como responsable a otra persona registrada
- **THEN** la tarea pasa a tener a esa persona como responsable, y su estado y su título no cambian

#### Scenario: Cambiar el título

- **WHEN** una persona actualiza el título de una tarea a «Demo del viernes»
- **THEN** la tarea pasa a llamarse «Demo del viernes», con el mismo estado y responsable

### Requirement: Actualización inválida

Al actualizar, el sistema SHALL aplicar al título las mismas reglas que al crear y SHALL rechazar un estado fuera de los tres valores o un responsable que no sea una persona registrada. En esos casos SHALL responder `422` y SHALL NOT modificar ningún campo. Si la tarea no existe, SHALL responder `404`.

#### Scenario: Responsable inexistente

- **WHEN** un cliente actualiza una tarea con un responsable que no corresponde a ninguna persona registrada
- **THEN** recibe `422` con un error sobre el responsable y la tarea no cambia

#### Scenario: Error en un campo bloquea los demás

- **WHEN** un cliente envía a la vez un estado válido y un título en blanco
- **THEN** recibe `422` y ni el estado ni el título cambian

#### Scenario: Tarea inexistente

- **WHEN** un cliente actualiza una tarea con un identificador que no existe
- **THEN** recibe `404`

### Requirement: Pantalla de la lista de tareas

La web SHALL tener una pantalla «Tareas», solo accesible con sesión, que muestre todas las tareas en una sola lista. Cada fila SHALL mostrar el título, el nombre del responsable y el estado («Pendiente», «En curso» o «Hecho»). La lista SHALL NOT mostrar fechas, marcas de vencida, correos, identificadores ni señales de presencia.

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

### Requirement: Responsable mostrado por su nombre

En la lista, el responsable SHALL identificarse por su nombre completo. Si no tiene nombre, SHALL mostrarse «Sin nombre». Nunca SHALL mostrarse su correo ni su identificador.

#### Scenario: Responsable con nombre

- **WHEN** la tarea la lleva «Grace Hopper»
- **THEN** la fila muestra «Grace Hopper»

#### Scenario: Responsable sin nombre

- **WHEN** la tarea la lleva una persona que se registró sin nombre
- **THEN** la fila muestra «Sin nombre», y en ningún sitio de la fila aparece su correo

### Requirement: Lista vacía

Si no hay ninguna tarea, la pantalla Tareas SHALL explicar qué es esa lista y SHALL invitar a crear la primera tarea, en lugar de mostrar una lista vacía sin más.

#### Scenario: Primera visita

- **WHEN** una persona abre Tareas y el espacio no tiene ninguna tarea
- **THEN** ve un mensaje que explica que aquí está el trabajo del equipo y la invita a crear la primera tarea, con el campo de título a mano

### Requirement: Crear una tarea desde la web

La pantalla Tareas SHALL ofrecer un formulario cuyo único campo es el título. SHALL NOT pedir ni sugerir responsable, estado ni fecha. Al crearse, la tarea SHALL aparecer en la lista sin recargar ni navegar, y el campo SHALL quedar vacío. Mientras se envía, el botón SHALL estar desactivado.

#### Scenario: Crear desde la lista

- **WHEN** una persona escribe «Revisar el PRD» y pulsa «Crear tarea»
- **THEN** la tarea aparece en la lista con su nombre como responsable y «Pendiente» como estado, sin recargar, y el campo queda vacío

#### Scenario: El formulario solo pide el título

- **WHEN** una persona mira el formulario de creación
- **THEN** solo hay un campo, el título, y ningún control de responsable, estado ni fecha

### Requirement: Errores al crear desde la web

Si el título no es válido, la pantalla Tareas SHALL explicar el problema bajo el campo, en castellano, sin crear la tarea. Un título vacío o en blanco SHALL mostrar «Escribe un título para la tarea.». Uno demasiado largo SHALL mostrar «El título no puede superar los 255 caracteres.». Cualquier otro fallo SHALL mostrarse en un aviso sobre el formulario.

#### Scenario: Crear sin título

- **WHEN** una persona pulsa «Crear tarea» con el campo vacío o con solo espacios
- **THEN** ve «Escribe un título para la tarea.» bajo el campo y la lista no cambia

#### Scenario: Título demasiado largo

- **WHEN** una persona intenta crear una tarea con un título de más de 255 caracteres
- **THEN** ve «El título no puede superar los 255 caracteres.» bajo el campo, su texto sigue en el campo sin recortar y no se crea nada

#### Scenario: Servidor apagado al crear

- **WHEN** una persona crea una tarea con el servidor apagado
- **THEN** ve el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y el título sigue escrito en el campo

### Requirement: Cambiar el estado desde la fila

Cada fila SHALL permitir cambiar el estado de su tarea desde la propia fila, ofreciendo como únicos destinos «Pendiente», «En curso» y «Hecho». El cambio SHALL hacerse con un solo gesto, sin abrir la tarea, sin diálogo de confirmación y sin rellenar ningún campo. SHALL reflejarse en la fila de inmediato y funcionar igual con cualquier tarea, sea quien sea su responsable.

#### Scenario: Marcar en curso

- **WHEN** una persona pulsa «En curso» en la fila de una tarea pendiente
- **THEN** la fila muestra «En curso» al momento, sin diálogo ni aviso, y al recargar sigue en «En curso»

#### Scenario: Tarea de otra persona

- **WHEN** una persona cambia el estado de una tarea que lleva otra persona
- **THEN** el cambio se aplica igual que en una tarea propia, sin advertencias

#### Scenario: Solo tres destinos

- **WHEN** una persona mira cómo cambiar el estado de una fila
- **THEN** los únicos destinos ofrecidos son «Pendiente», «En curso» y «Hecho», y el estado actual se distingue de los otros dos

### Requirement: Fallo al cambiar el estado

Si el servidor no acepta un cambio de estado hecho desde la fila, la fila SHALL volver a mostrar el estado anterior y la pantalla SHALL mostrar un aviso con el motivo.

#### Scenario: Servidor apagado al cambiar el estado

- **WHEN** una persona cambia el estado de una tarea con el servidor apagado
- **THEN** la fila vuelve a su estado anterior y ve el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.»

### Requirement: Carga de la lista

Mientras carga la lista, la pantalla Tareas SHALL mostrar un indicador de carga. Si la carga falla, SHALL mostrar un aviso con el motivo y un botón «Reintentar» que vuelve a pedirla.

#### Scenario: Carga con el servidor apagado

- **WHEN** una persona abre Tareas con el servidor apagado
- **THEN** ve el aviso de servidor inaccesible y el botón «Reintentar», y al pulsarlo con el servidor ya encendido ve la lista
