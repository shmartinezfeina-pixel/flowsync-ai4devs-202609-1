# auth

## Purpose

Permitir que una persona cree una cuenta en FlowSync, inicie y cierre sesión y consulte su perfil, tanto a través de la API HTTP como desde la aplicación web. Esta spec describe el comportamiento que el sistema tiene hoy; no propone cambios.

## Requirements

### Requirement: Respuestas de la API en JSON

Las rutas de cuentas de la API SHALL responder siempre en JSON, aunque la petición pida otro formato. Las respuestas correctas SHALL ir envueltas en una clave `data`, salvo la del cierre de sesión. Las respuestas de error SHALL llevar una lista `errors` en la que cada elemento tiene un `message` y, si el error es de validación, el `field` afectado y la `rule` incumplida.

#### Scenario: Petición que pide HTML

- **WHEN** un cliente envía una petición de inicio de sesión con la cabecera `Accept: text/html`
- **THEN** la respuesta llega igualmente en JSON

#### Scenario: Respuesta correcta envuelta

- **WHEN** un cliente consulta su perfil con una sesión válida
- **THEN** los datos del usuario llegan dentro de `data`

#### Scenario: Error de validación

- **WHEN** un cliente envía un registro sin email
- **THEN** la respuesta contiene `errors` con un elemento cuyo `field` es `email` y cuya `rule` es `required`

### Requirement: Datos públicos del usuario

Cada vez que la API devuelva un usuario, SHALL incluir exactamente su identificador, su nombre completo (o `null` si no tiene), su email, sus iniciales y sus fechas de alta y de última modificación. La API SHALL NOT devolver nunca la contraseña.

#### Scenario: La contraseña nunca sale

- **WHEN** la API devuelve un usuario en cualquier respuesta
- **THEN** la respuesta no contiene la contraseña, ni en claro ni cifrada

### Requirement: Iniciales del usuario

Las iniciales del usuario SHALL ir en mayúsculas. Con un nombre de dos o más palabras separadas por un espacio, SHALL ser la primera letra de cada una de las dos primeras palabras. Con un nombre de una sola palabra, SHALL ser sus dos primeras letras (o la única, si solo tiene una). Sin nombre, SHALL ser la primera letra de lo que va antes de la arroba del email y la de lo que va después.

#### Scenario: Nombre de varias palabras

- **WHEN** se devuelve una persona llamada «Ana María López»
- **THEN** sus iniciales son «AM»

#### Scenario: Nombre de una sola palabra

- **WHEN** se devuelve una persona llamada «Luis»
- **THEN** sus iniciales son «LU»

#### Scenario: Sin nombre

- **WHEN** se devuelve una persona sin nombre cuyo email es «grace@example.test»
- **THEN** su nombre es `null` y sus iniciales son «GE»

### Requirement: Registro de cuenta por API

El sistema SHALL permitir crear una cuenta mediante `POST /api/v1/auth/signup` con nombre completo, email, contraseña y confirmación de contraseña. Si los datos son válidos, SHALL crear la cuenta y responder con `200`, los datos públicos del usuario nuevo y un token de sesión ya utilizable, sin necesidad de iniciar sesión después.

#### Scenario: Registro correcto

- **WHEN** un cliente registra un email nuevo con una contraseña de 8 caracteres repetida igual en la confirmación
- **THEN** recibe `200` con el usuario y un token, y ese token da acceso inmediato al perfil

#### Scenario: Forma de la respuesta de registro

- **WHEN** un registro se completa correctamente
- **THEN** la respuesta tiene la forma `{ "data": { "user": { … }, "token": "…" } }`

### Requirement: Recorte de espacios en la API

En las peticiones de registro e inicio de sesión, el sistema SHALL quitar los espacios al principio y al final de todos los campos de texto (nombre, email, contraseña y confirmación) antes de validarlos y guardarlos. Un campo que queda vacío tras el recorte SHALL tratarse como ausente.

#### Scenario: Contraseña con espacios en los extremos

- **WHEN** un cliente se registra con la contraseña «  1234567  » y la confirmación «1234567»
- **THEN** recibe `422` por longitud mínima, porque tras el recorte la contraseña tiene 7 caracteres

#### Scenario: Contraseña solo con espacios en el login

- **WHEN** un cliente inicia sesión con la contraseña «   »
- **THEN** recibe `422` con un error `required` sobre la contraseña

### Requirement: Nombre y email en el registro

La clave del nombre SHALL estar presente en la petición de registro, aunque su valor sea `null`. Un nombre vacío o formado solo por espacios SHALL guardarse como «sin nombre», y el email SHALL guardarse sin espacios en los extremos.

#### Scenario: Nombre en blanco

- **WHEN** un cliente registra una cuenta con el nombre «   »
- **THEN** la cuenta se crea con el nombre a `null`

#### Scenario: Falta la clave del nombre

- **WHEN** un cliente envía un registro válido pero sin incluir la clave del nombre
- **THEN** recibe `422` con un error `required` sobre el nombre y no se crea ninguna cuenta

#### Scenario: Espacios alrededor del email

- **WHEN** un cliente registra el email «  ana@example.test  »
- **THEN** la cuenta se guarda con el email «ana@example.test»

### Requirement: Validación del registro

Si los datos del registro no son válidos, el sistema SHALL responder `422` con todos los errores a la vez y SHALL NOT crear la cuenta. Para ser válidos:
- El nombre es texto o `null`.
- El email tiene formato válido, no pasa de 254 caracteres y no es de otra cuenta.
- La contraseña y la confirmación tienen entre 8 y 32 caracteres.
- La confirmación es idéntica a la contraseña.

#### Scenario: Cuerpo vacío

- **WHEN** un cliente envía un registro sin ningún campo
- **THEN** recibe `422` con un error `required` por cada uno de los cuatro campos

#### Scenario: Varios errores a la vez

- **WHEN** un cliente registra un email ya existente con la contraseña «123»
- **THEN** recibe `422` con el error de email ya registrado y el de longitud mínima de la contraseña en la misma respuesta

#### Scenario: Contraseña demasiado larga

- **WHEN** un cliente registra una contraseña de 33 caracteres
- **THEN** recibe `422` con un error de longitud máxima sobre la contraseña

#### Scenario: Contraseñas distintas

- **WHEN** un cliente envía una contraseña y una confirmación válidas pero diferentes
- **THEN** recibe `422` con un único error sobre la confirmación

### Requirement: Emails distintos por mayúsculas

El sistema SHALL tratar como distintos dos emails que solo se diferencian en mayúsculas y minúsculas, tanto al registrar como al iniciar sesión.

#### Scenario: Mismo email con otra capitalización

- **WHEN** ya existe «ana@example.test» y un cliente registra «ANA@EXAMPLE.TEST»
- **THEN** se crea una segunda cuenta, independiente de la primera

#### Scenario: Inicio de sesión con otra capitalización

- **WHEN** solo existe la cuenta «ana@example.test» y un cliente inicia sesión como «ANA@EXAMPLE.TEST» con su contraseña correcta
- **THEN** recibe `400` por credenciales incorrectas

### Requirement: Inicio de sesión por API

El sistema SHALL permitir iniciar sesión mediante `POST /api/v1/auth/login` con email y contraseña. Si las credenciales son correctas, SHALL responder con `200`, los datos públicos del usuario y un token de sesión nuevo. Cada inicio de sesión SHALL crear una sesión independiente, sin cerrar las anteriores.

#### Scenario: Credenciales correctas

- **WHEN** un cliente inicia sesión con el email y la contraseña de una cuenta existente
- **THEN** recibe `200` con el usuario y un token que da acceso al perfil, con la forma `{ "data": { "user": { … }, "token": "…" } }`

#### Scenario: Varias sesiones simultáneas

- **WHEN** un cliente inicia sesión dos veces con la misma cuenta
- **THEN** recibe dos tokens distintos y los dos dan acceso al perfil

### Requirement: Inicio de sesión rechazado por API

Si el email no existe o la contraseña no coincide, el sistema SHALL responder `400` con el mismo mensaje en ambos casos, para no revelar qué emails están registrados. Si falta algún campo o el email no tiene formato válido, SHALL responder `422` con los errores de validación.

#### Scenario: Credenciales incorrectas

- **WHEN** un cliente inicia sesión con una contraseña equivocada, o con un email que no existe
- **THEN** en ambos casos recibe `400` con el mensaje «Invalid user credentials» y sin indicar ningún campo

#### Scenario: Datos con formato inválido

- **WHEN** un cliente inicia sesión con el email «bad» y sin contraseña
- **THEN** recibe `422` con un error de formato sobre el email y uno `required` sobre la contraseña

### Requirement: Perfil autenticado por API

El sistema SHALL devolver los datos públicos de la persona autenticada en `GET /api/v1/account/profile` cuando la petición lleve un token válido en la cabecera `Authorization: Bearer`. Sin token, con un token inventado o con uno ya revocado, SHALL responder `401` con el mensaje «Unauthorized access».

#### Scenario: Perfil con token válido

- **WHEN** un cliente consulta el perfil con el token recibido al iniciar sesión
- **THEN** recibe `200` con los datos de su propia cuenta

#### Scenario: Sin token

- **WHEN** un cliente consulta el perfil sin cabecera de autorización
- **THEN** recibe `401`

#### Scenario: Token inventado o revocado

- **WHEN** un cliente consulta el perfil con un token que nunca existió, o con uno ya cerrado
- **THEN** recibe `401`

### Requirement: Cierre de sesión por API

El sistema SHALL permitir cerrar sesión mediante `POST /api/v1/account/logout` con un token válido. Al cerrar, SHALL revocar solo ese token y responder `200` con un mensaje de confirmación, que no va envuelto en `data`. Las demás sesiones de la misma cuenta SHALL seguir abiertas. Sin un token válido, SHALL responder `401`.

#### Scenario: Cierre correcto

- **WHEN** un cliente cierra sesión con su token
- **THEN** recibe `200` con el mensaje «Logged out successfully», y a partir de ese momento ese token recibe `401` en el perfil

#### Scenario: Otras sesiones siguen abiertas

- **WHEN** una cuenta tiene dos sesiones abiertas y se cierra una de ellas
- **THEN** el token de la otra sesión sigue dando acceso al perfil

#### Scenario: Cerrar dos veces

- **WHEN** un cliente intenta cerrar sesión con un token que ya cerró
- **THEN** recibe `401`

### Requirement: Navegación según la sesión en la web

La aplicación web SHALL tener cuatro pantallas: inicio de sesión, registro, tareas y perfil.
- Sin sesión, solo SHALL mostrar las de inicio de sesión y registro.
- Con sesión, solo SHALL mostrar las de tareas y perfil, y la de tareas SHALL ser la de inicio.
- Cualquier otra dirección SHALL llevar a tareas, o al inicio de sesión si no hay sesión.
- Mientras comprueba una sesión guardada, SHALL mostrar un indicador de carga en lugar de redirigir.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre el perfil o la lista de tareas
- **THEN** acaba en la pantalla de inicio de sesión

#### Scenario: Login o registro con sesión

- **WHEN** una persona con sesión abre la pantalla de inicio de sesión o la de registro
- **THEN** acaba en la lista de tareas

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no existe
- **THEN** acaba en la lista de tareas si tiene sesión, o en el inicio de sesión si no la tiene

#### Scenario: Enlaces entre pantallas

- **WHEN** una persona está en el inicio de sesión y pulsa «Crea una», o está en el registro y pulsa «Inicia sesión»
- **THEN** pasa a la otra pantalla

#### Scenario: Enlaces entre tareas y perfil

- **WHEN** una persona con sesión está en tareas y pulsa «Perfil», o está en el perfil y pulsa «Tareas»
- **THEN** pasa a la otra pantalla

### Requirement: Pantalla de registro

La pantalla de registro SHALL pedir el nombre completo (marcado como «(opcional)»), el email, la contraseña (con la pista «Entre 8 y 32 caracteres.») y su confirmación («Repite la contraseña»). Mientras se envía, el botón SHALL decir «Creando cuenta…» y estar desactivado. Si el registro tiene éxito, la persona SHALL quedar con la sesión iniciada y ver la lista de tareas.

#### Scenario: Registro correcto desde la web

- **WHEN** una persona rellena email y dos contraseñas iguales de entre 8 y 32 caracteres y pulsa «Crear cuenta»
- **THEN** ve la lista de tareas con la sesión ya iniciada

#### Scenario: Registro sin nombre

- **WHEN** una persona deja el nombre vacío, completa el resto correctamente y después abre su perfil
- **THEN** la cuenta se crea y el perfil muestra «Sin nombre»

#### Scenario: Email ya registrado

- **WHEN** una persona se registra con un email que ya tiene cuenta
- **THEN** ve «Ese email ya está registrado. Inicia sesión en su lugar.» bajo el campo de email

### Requirement: Comprobación local de las contraseñas

Si la contraseña y su confirmación no coinciden, la pantalla de registro SHALL mostrar «Las contraseñas no coinciden.» bajo la confirmación, sin contactar con el servidor.

#### Scenario: Contraseñas distintas

- **WHEN** una persona escribe dos contraseñas diferentes y pulsa «Crear cuenta»
- **THEN** ve «Las contraseñas no coinciden.» bajo la confirmación y no se envía nada al servidor

### Requirement: Pantalla de inicio de sesión

La pantalla de inicio de sesión SHALL pedir email y contraseña. Mientras se envía, el botón SHALL decir «Entrando…» y estar desactivado. Si las credenciales son correctas, la persona SHALL ver la lista de tareas. Si son incorrectas, SHALL ver un aviso general con «El email o la contraseña no son correctos.».

#### Scenario: Entrada correcta

- **WHEN** una persona introduce el email y la contraseña de su cuenta y pulsa «Entrar»
- **THEN** ve la lista de tareas

#### Scenario: Credenciales incorrectas

- **WHEN** una persona introduce una contraseña equivocada o un email sin cuenta
- **THEN** ve el aviso «El email o la contraseña no son correctos.» y sigue en la pantalla de inicio de sesión

#### Scenario: Campos vacíos

- **WHEN** una persona pulsa «Entrar» sin rellenar nada
- **THEN** ve «Falta rellenar el email.» bajo el email y «Falta rellenar la contraseña.» bajo la contraseña

### Requirement: Ubicación de los errores en los formularios

En los formularios de acceso, un error de validación de un campo SHALL aparecer bajo ese campo, y solo el primero de cada campo. Si todos los errores aparecen así, SHALL NOT mostrarse también un aviso general. Cualquier otro error SHALL mostrarse en un aviso general sobre el formulario. Cada nuevo envío SHALL borrar los errores del anterior.

#### Scenario: Reintento

- **WHEN** una persona corrige un error y vuelve a enviar
- **THEN** los errores del envío anterior desaparecen

### Requirement: Mensajes de validación en castellano

Los formularios de acceso SHALL mostrar los errores de validación en castellano: «Falta rellenar …», «Introduce una dirección de email válida.», «… debe tener al menos N caracteres.», «… no puede superar los N caracteres.», «Las contraseñas no coinciden.» y «Ese email ya está registrado. Inicia sesión en su lugar.». El hueco «…» SHALL ser «el nombre», «el email», «la contraseña» o «la confirmación de la contraseña», según el campo.

#### Scenario: Email con formato inválido

- **WHEN** una persona envía cualquiera de los dos formularios con el email «ana»
- **THEN** ve «Introduce una dirección de email válida.» bajo el email

#### Scenario: Contraseña demasiado corta

- **WHEN** una persona se registra con «1234567» como contraseña y como confirmación
- **THEN** ve «la contraseña debe tener al menos 8 caracteres.» bajo la contraseña

### Requirement: Mensajes de fallo del servidor

Si el servidor no responde, los formularios de acceso SHALL mostrar en el aviso general «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.». Ante cualquier otra respuesta de error que no sea de credenciales, de sesión o de validación (por ejemplo, un error interno), SHALL mostrar «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.».

#### Scenario: Servidor apagado

- **WHEN** una persona envía cualquiera de los dos formularios con el servidor apagado
- **THEN** ve en el aviso general «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.»

#### Scenario: Error interno del servidor

- **WHEN** el servidor responde con un error interno al enviar un formulario
- **THEN** ve en el aviso general «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.»

### Requirement: Sesión recordada en el navegador

La aplicación web SHALL recordar la sesión en el navegador, de modo que siga iniciada al recargar o al volver a abrir la aplicación. Al arrancar con una sesión recordada, SHALL comprobarla con el servidor antes de mostrar ninguna pantalla protegida.

#### Scenario: Recarga con sesión válida

- **WHEN** una persona con sesión iniciada recarga la página del perfil
- **THEN** ve brevemente un indicador de carga y después su perfil, sin pasar por el inicio de sesión

### Requirement: Sesión recordada que no se puede restaurar

Si el servidor rechaza la sesión recordada, la aplicación web SHALL olvidarla y llevar al inicio de sesión con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.». Si el servidor no responde o falla con otro error, SHALL llevar al inicio de sesión con el aviso correspondiente, pero SHALL conservar la sesión recordada para recuperarla al recargar cuando el servidor funcione.

#### Scenario: Sesión rechazada por el servidor

- **WHEN** una persona abre la aplicación con una sesión recordada que el servidor ya no acepta
- **THEN** acaba en el inicio de sesión con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.», y al recargar sigue sin sesión y sin aviso

#### Scenario: Servidor inaccesible al abrir la aplicación

- **WHEN** una persona abre la aplicación con una sesión recordada y el servidor está apagado
- **THEN** ve el inicio de sesión con el aviso de servidor inaccesible, y al recargar con el servidor ya encendido vuelve a ver la lista de tareas

#### Scenario: Error interno al abrir la aplicación

- **WHEN** una persona abre la aplicación con una sesión recordada y el servidor responde con un error interno al comprobarla
- **THEN** ve el inicio de sesión con el aviso «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.», y al recargar con el servidor ya recuperado vuelve a ver la lista de tareas

#### Scenario: Aviso de sesión frente a error del formulario

- **WHEN** la pantalla de inicio de sesión muestra un aviso de sesión perdida y la persona envía el formulario con credenciales incorrectas
- **THEN** el aviso general pasa a mostrar el error del envío en lugar del de la sesión perdida

### Requirement: Pantalla de perfil

La pantalla de perfil SHALL mostrar:
- Un círculo con las iniciales de la persona.
- Su nombre completo, o «Sin nombre» si no tiene.
- Su email.
- «Miembro desde», con la fecha de alta en formato largo en castellano.
- Un enlace «Tareas» a la lista de tareas.
- El botón «Cerrar sesión».

#### Scenario: Perfil con nombre

- **WHEN** una persona registrada como «Ada Byron Lovelace» abre su perfil
- **THEN** ve el círculo «AB», el nombre «Ada Byron Lovelace», su email y una fecha como «7 de octubre de 2026» junto a «Miembro desde»

#### Scenario: Perfil sin nombre

- **WHEN** una persona registrada sin nombre abre su perfil
- **THEN** ve «Sin nombre» en lugar del nombre y las iniciales calculadas a partir de su email

#### Scenario: Volver a las tareas

- **WHEN** una persona pulsa «Tareas» en su perfil
- **THEN** ve la lista de tareas

### Requirement: Cierre de sesión desde la web

Al pulsar «Cerrar sesión», el botón SHALL pasar a «Cerrando sesión…» y desactivarse, y la aplicación web SHALL olvidar la sesión en el navegador y llevar a la persona al inicio de sesión de inmediato. También SHALL pedir al servidor que cierre esa sesión, sin mostrar ningún error si esa petición falla.

#### Scenario: Cierre de sesión

- **WHEN** una persona pulsa «Cerrar sesión» en su perfil
- **THEN** acaba en el inicio de sesión sin ningún aviso, y al recargar sigue sin sesión

#### Scenario: Cierre con el servidor inaccesible

- **WHEN** una persona pulsa «Cerrar sesión» con el servidor apagado
- **THEN** la sesión se cierra igualmente en el navegador y no se muestra ningún error
