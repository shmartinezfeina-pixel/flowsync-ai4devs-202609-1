# tasks Specification

## Purpose
Dar al equipo una sola lista compartida de tareas, la misma para todos, en la que cada tarea dice de un vistazo su título, quién la lleva y en qué estado está. Se crea con solo un título y su estado se cambia sin salir de la lista.

## Requirements

### Requirement: Datos de una tarea en la API

Cada vez que la API devuelva una tarea, SHALL incluir exactamente su identificador, su título, su estado, su responsable, su fecha de vencimiento (`dueDate`, `YYYY-MM-DD` o `null`) y su veredicto de vencimiento (`isOverdue`, booleano). Del responsable SHALL incluir solo su identificador y su nombre completo (o `null` si no tiene). La API SHALL NOT devolver el email ni ningún otro dato de cuenta del responsable.

#### Scenario: Forma de una tarea

- **WHEN** la API devuelve una tarea sin fecha cuyo responsable se llama «Ada Lovelace»
- **THEN** la tarea tiene la forma `{ "id": …, "title": "…", "status": "pending", "dueDate": null, "isOverdue": false, "assignee": { "id": …, "fullName": "Ada Lovelace" } }` y nada más

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

#### Scenario: Token inventado o revocado

- **WHEN** un cliente pide la lista o actualiza una tarea con un token que nunca existió o que ya se cerró
- **THEN** recibe `401` y no se devuelve ni se modifica ninguna tarea

#### Scenario: Crear sin sesión

- **WHEN** un cliente intenta crear una tarea sin token
- **THEN** recibe `401` y no se crea ninguna tarea

### Requirement: Listar todas las tareas

`GET /api/v1/tasks` SHALL responder `200` con todas las tareas del espacio dentro de `data`, sin ningún filtro por persona. El conjunto de tareas y sus datos SHALL ser los mismos sea quien sea quien lo pida; solo `isOverdue` puede variar según el día de referencia de cada petición. Listar SHALL NOT modificar ninguna tarea. El sistema no garantiza ningún orden concreto.

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

#### Scenario: Mismo día, mismo veredicto

- **WHEN** dos personas piden la lista con el mismo `X-Client-Date`
- **THEN** reciben también los mismos valores de `isOverdue`

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

#### Scenario: Sin fecha no se penaliza en la lista

- **WHEN** una persona mira en la lista una tarea sin fecha
- **THEN** no ve ningún aviso, recordatorio ni indicación de que le falte algo

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

### Requirement: Fecha de vencimiento opcional

Una tarea SHALL poder tener una fecha de vencimiento, que es una fecha de calendario sin hora (`YYYY-MM-DD`), o no tener ninguna (`null`). Crear una tarea sin fecha SHALL ser el camino por defecto. Las tareas que ya existían SHALL quedar sin fecha.

#### Scenario: Tarea creada sin fecha

- **WHEN** un cliente crea una tarea enviando solo el título
- **THEN** la tarea nace con `dueDate` a `null` e `isOverdue` a `false`

#### Scenario: El formulario de creación no ofrece fecha

- **WHEN** una persona crea una tarea desde la lista
- **THEN** solo escribe el título y en ningún momento se le ofrece ni se le sugiere poner una fecha

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

- **WHEN** un cliente envía `isOverdue: false` al actualizar el título de una tarea pendiente con fecha anterior al día de referencia
- **THEN** la respuesta trae `isOverdue` a `true`, porque el veredicto solo lo da la regla

#### Scenario: Veredicto enviado al crear

- **WHEN** un cliente crea una tarea sin fecha enviando `isOverdue: true`
- **THEN** recibe `201` con `isOverdue` a `false`

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

#### Scenario: Cabecera inválida al actualizar

- **WHEN** un cliente cambia el estado de una tarea con `X-Client-Date: 07/10/2026`
- **THEN** recibe `422` y el estado de la tarea no cambia

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

#### Scenario: Fecha de una tarea ajena

- **WHEN** una persona pone fecha a una tarea cuyo responsable es otra persona
- **THEN** recibe `200` con la fecha puesta, sin permiso especial ni advertencia

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

La fecha SHALL guardarse sola, sin botón de guardar, en cuanto el campo tenga una fecha completa, al salir del campo y al dejar la pantalla, y el resultado SHALL verse al instante. «Quitar fecha» SHALL quitarla sin confirmación. Una fecha incompleta o inválida SHALL NOT guardarse: se conserva la anterior y se muestra bajo el campo «Introduce una fecha completa y válida.».

#### Scenario: Poner la fecha

- **WHEN** una persona escribe una fecha en una tarea sin fecha y sale del campo
- **THEN** la fecha queda guardada y la pantalla la refleja sin recargar

#### Scenario: Elegir en el calendario

- **WHEN** una persona elige un día en el selector de fecha sin salir del campo
- **THEN** la fecha se guarda sola en un momento y, si queda vencida, aparece la señal «Vencida»

#### Scenario: Quitar sin confirmar

- **WHEN** una persona pulsa «Quitar fecha»
- **THEN** la fecha desaparece al momento, sin ningún diálogo, y la señal de vencida, si estaba, también

#### Scenario: Fecha incompleta

- **WHEN** una persona deja el campo con una fecha a medio escribir y sale de él
- **THEN** ve «Introduce una fecha completa y válida.» bajo el campo y la tarea conserva la fecha anterior

#### Scenario: Quitar con una fecha a medio escribir

- **WHEN** una persona tiene una fecha a medio escribir y pulsa «Quitar fecha»
- **THEN** la tarea queda sin fecha y no aparece el aviso de fecha incompleta

#### Scenario: Al volver a la lista ya está guardado

- **WHEN** una persona cambia la fecha y sale de la pantalla con «Volver a la lista» o con el botón Atrás del navegador
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
