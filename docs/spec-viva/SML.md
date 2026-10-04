# Gestión de cuentas y accesos

## Purpose

Permitir que una persona cree su cuenta en FlowSync, inicie y cierre sesión, mantenga la sesión abierta entre visitas y consulte los datos de su perfil, tanto a través de la API como desde la aplicación web.

## Requirements

### Requirement: Formato común de las respuestas de la API

La API SHALL responder siempre en JSON, con independencia de la cabecera `Accept` de la petición. Las respuestas correctas de registro, inicio de sesión y perfil SHALL ir envueltas en un objeto `data`. Las respuestas de error SHALL tener la forma `{ "errors": [ ... ] }`, donde cada elemento lleva al menos un `message` en inglés.

#### Scenario: Petición sin cabecera Accept de JSON

- **WHEN** un cliente llama a cualquier endpoint de la capacidad indicando `Accept: text/html` o sin indicar `Accept`
- **THEN** la respuesta tiene cuerpo JSON

#### Scenario: Respuesta correcta envuelta

- **WHEN** un cliente consulta su perfil con un token válido
- **THEN** el cuerpo de la respuesta es `{ "data": { ... } }` con los datos del usuario dentro de `data`

### Requirement: Representación pública del usuario

Cada vez que la API devuelva un usuario SHALL incluir exactamente los campos `id` (número), `fullName` (texto o `null`), `email`, `createdAt` y `updatedAt` (fechas ISO 8601) e `initials`. La API SHALL NOT devolver nunca la contraseña ni ningún derivado de ella.

#### Scenario: Usuario con nombre completo

- **WHEN** se devuelve un usuario registrado con el nombre «Ada Byron Lovelace»
- **THEN** `initials` vale `"AB"`: la primera letra del primer y del segundo trozo del nombre separados por un espacio, en mayúsculas

#### Scenario: Usuario con nombre de una sola palabra

- **WHEN** se devuelve un usuario registrado con el nombre «Ada»
- **THEN** `initials` vale `"AD"`: las dos primeras letras del nombre, en mayúsculas

#### Scenario: Nombre con espacios dobles

- **WHEN** se devuelve un usuario registrado con el nombre «Ada  Byron» (dos espacios seguidos)
- **THEN** `initials` vale `"AD"`: como el segundo trozo queda vacío, se toman las dos primeras letras del primero

#### Scenario: Usuario sin nombre

- **WHEN** se devuelve un usuario registrado sin nombre y con el email `specprobe@ejemplo.com`
- **THEN** `fullName` es `null` e `initials` vale `"SE"`: la primera letra de lo que hay antes de la arroba y la primera de lo que hay después, en mayúsculas

#### Scenario: Ausencia de la contraseña

- **WHEN** cualquier respuesta de la capacidad incluye un usuario
- **THEN** el objeto no contiene ningún campo con la contraseña

### Requirement: Registro de cuenta por API

El sistema SHALL permitir crear una cuenta con `POST /api/v1/auth/signup` sin autenticación previa, enviando `fullName`, `email`, `password` y `passwordConfirmation`. Al crearla SHALL abrir sesión en el mismo paso, respondiendo `200` con `{ "data": { "user": {...}, "token": "..." } }`, donde `token` es un token de acceso opaco que empieza por `oat_` y no tiene caducidad.

#### Scenario: Registro correcto

- **WHEN** se envían un nombre, un email válido no registrado, una contraseña de entre 8 y 32 caracteres y la misma contraseña como confirmación
- **THEN** la respuesta es `200` con el usuario creado y un token que ya sirve para consultar el perfil

#### Scenario: Nombre vacío o en blanco

- **WHEN** se envía `fullName` con valor `null`, cadena vacía o solo espacios, junto al resto de datos válidos
- **THEN** la cuenta se crea y el usuario devuelto tiene `fullName: null`

#### Scenario: Falta la clave del nombre

- **WHEN** la petición no incluye la clave `fullName`
- **THEN** la respuesta es `422` con un error de regla `required` sobre el campo `fullName`, aunque el nombre sea opcional

### Requirement: Validación del registro

El registro SHALL rechazar con `422` cualquier petición inválida, devolviendo de una vez todos los errores encontrados; cada error SHALL incluir `message`, `rule`, `field` y, en las reglas de longitud, `meta` con el límite. Las reglas SHALL ser: email obligatorio, con formato válido y de como máximo 254 caracteres; email no registrado previamente; contraseña y confirmación obligatorias y de entre 8 y 32 caracteres; confirmación idéntica a la contraseña.

#### Scenario: Cuerpo vacío

- **WHEN** se envía un cuerpo `{}`
- **THEN** la respuesta es `422` con un error `required` para cada uno de `fullName`, `email`, `password` y `passwordConfirmation`

#### Scenario: Varios errores a la vez

- **WHEN** se envía un email sin formato válido y una contraseña de 3 caracteres
- **THEN** la respuesta es `422` e incluye a la vez el error `email` sobre `email` y el error `minLength` con `meta.min: 8` sobre `password`

#### Scenario: Contraseña demasiado larga

- **WHEN** se envían una contraseña y una confirmación de 33 caracteres
- **THEN** la respuesta es `422` con errores `maxLength` y `meta.max: 32` sobre `password` y sobre `passwordConfirmation`

#### Scenario: Email ya registrado

- **WHEN** se intenta registrar un email que ya pertenece a una cuenta, escrito exactamente igual
- **THEN** la respuesta es `422` con un error de regla `database.unique` sobre `email` y no se crea ninguna cuenta

#### Scenario: Mismo email con distinta capitalización

- **WHEN** ya existe una cuenta con `ana@ejemplo.com` y se registra `ANA@EJEMPLO.COM`
- **THEN** la cuenta se crea como una cuenta distinta: el sistema distingue mayúsculas y minúsculas en el email

### Requirement: Inicio de sesión por API

El sistema SHALL permitir iniciar sesión con `POST /api/v1/auth/login` enviando `email` y `password`. Con credenciales correctas SHALL responder `200` con `{ "data": { "user": {...}, "token": "..." } }` y emitir un token nuevo en cada inicio de sesión, sin invalidar los emitidos antes.

#### Scenario: Credenciales correctas

- **WHEN** se envían el email (con la misma capitalización con la que se registró) y la contraseña de una cuenta existente
- **THEN** la respuesta es `200` con el usuario y un token nuevo

#### Scenario: Varias sesiones simultáneas

- **WHEN** una persona inicia sesión dos veces y obtiene dos tokens
- **THEN** ambos tokens permiten consultar el perfil

#### Scenario: Contraseña incorrecta o email desconocido

- **WHEN** se envía un email que no existe, o un email existente con una contraseña equivocada
- **THEN** en ambos casos la respuesta es `400` con `{ "errors": [{ "message": "Invalid user credentials" }] }`, sin indicar cuál de los dos datos falla

#### Scenario: Datos con formato inválido

- **WHEN** se envía un email sin formato válido o se omite la contraseña
- **THEN** la respuesta es `422` con los errores por campo (`email`, `required`); en el inicio de sesión el email sí se limita a 254 caracteres, pero no se comprueba la longitud de la contraseña

### Requirement: Acceso autenticado y perfil por API

El sistema SHALL devolver los datos de la persona autenticada en `GET /api/v1/account/profile` cuando la petición lleve `Authorization: Bearer <token>` con un token válido. Sin token válido, este endpoint y el de cierre de sesión SHALL responder `401` con `{ "errors": [{ "message": "Unauthorized access" }] }`.

#### Scenario: Perfil con token válido

- **WHEN** se consulta el perfil con un token obtenido en el registro o en el inicio de sesión
- **THEN** la respuesta es `200` con `{ "data": { ...usuario... } }`

#### Scenario: Sin token

- **WHEN** se consulta el perfil sin cabecera `Authorization`
- **THEN** la respuesta es `401` con el mensaje `Unauthorized access`

#### Scenario: Token inventado o revocado

- **WHEN** se consulta el perfil con un token que no existe o que ya se ha cerrado
- **THEN** la respuesta es `401` con el mensaje `Unauthorized access`

### Requirement: Cierre de sesión por API

El sistema SHALL permitir cerrar sesión con `POST /api/v1/account/logout` y token válido, revocando únicamente el token usado en esa petición. La respuesta correcta SHALL ser `200` con `{ "message": "Logged out successfully" }`, sin envoltorio `data`.

#### Scenario: Cierre correcto

- **WHEN** se cierra sesión con un token válido
- **THEN** la respuesta es `200` con `{ "message": "Logged out successfully" }` y ese token deja de servir: consultar el perfil con él devuelve `401`

#### Scenario: Otras sesiones siguen abiertas

- **WHEN** una persona tiene dos tokens y cierra sesión con uno de ellos
- **THEN** el otro token sigue permitiendo consultar el perfil

#### Scenario: Cerrar dos veces

- **WHEN** se vuelve a cerrar sesión con un token ya revocado
- **THEN** la respuesta es `401`

### Requirement: Navegación según el estado de la sesión en la web

La aplicación web SHALL ofrecer las pantallas de inicio de sesión (`/login`), registro (`/register`) y perfil (`/profile`). Sin sesión, SHALL llevar a `/login` a quien intente entrar en el perfil; con sesión, SHALL llevar al perfil a quien intente entrar en el inicio de sesión o en el registro. Cualquier otra dirección SHALL llevar al perfil, y de ahí al inicio de sesión si no hay sesión.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** acaba en la pantalla de inicio de sesión

#### Scenario: Login o registro con sesión

- **WHEN** una persona con sesión abierta abre `/login` o `/register`
- **THEN** acaba en la pantalla de perfil

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no es ninguna de las tres pantallas
- **THEN** acaba en el perfil si tiene sesión, o en el inicio de sesión si no la tiene

#### Scenario: Enlaces entre login y registro

- **WHEN** una persona está en la pantalla de inicio de sesión o en la de registro
- **THEN** ve un enlace «Crea una» (en el login) o «Inicia sesión» (en el registro) que la lleva a la otra pantalla

### Requirement: Pantalla de registro

La pantalla de registro SHALL mostrar el nombre «FlowSync», el título «Crea tu cuenta», el texto «Regístrate para empezar a organizar el trabajo del equipo.» y los campos «Nombre completo (opcional)», «Email», «Contraseña» (con la ayuda «Entre 8 y 32 caracteres.») y «Repite la contraseña», más el botón «Crear cuenta». Al registrarse con éxito SHALL dejar a la persona con la sesión abierta en su perfil.

#### Scenario: Registro correcto desde la web

- **WHEN** una persona rellena el formulario con datos válidos y pulsa «Crear cuenta»
- **THEN** el botón pasa a «Creando cuenta…» y queda desactivado mientras se envía, y después la persona ve su perfil con la sesión abierta

#### Scenario: Registro sin nombre

- **WHEN** una persona deja vacío o solo con espacios el campo «Nombre completo» y el resto es válido
- **THEN** la cuenta se crea sin nombre

#### Scenario: Contraseñas distintas

- **WHEN** la contraseña y su repetición no coinciden y se pulsa «Crear cuenta»
- **THEN** aparece «Las contraseñas no coinciden.» bajo «Repite la contraseña» y no se envía nada al servidor

#### Scenario: Email ya registrado

- **WHEN** una persona intenta registrarse con un email que ya tiene cuenta
- **THEN** aparece bajo el campo Email el mensaje «Ese email ya está registrado. Inicia sesión en su lugar.»

#### Scenario: Contraseña demasiado corta

- **WHEN** una persona envía una contraseña y una repetición iguales de menos de 8 caracteres
- **THEN** aparece «la contraseña debe tener al menos 8 caracteres.» en lugar de la ayuda bajo «Contraseña», y «la confirmación de la contraseña debe tener al menos 8 caracteres.» bajo «Repite la contraseña»

### Requirement: Pantalla de inicio de sesión

La pantalla de inicio de sesión SHALL mostrar el nombre «FlowSync», el título «Inicia sesión», el texto «Entra con tu cuenta para volver a tus tareas.», los campos «Email» y «Contraseña» y el botón «Entrar». Al entrar con éxito SHALL llevar a la persona a su perfil con la sesión abierta.

#### Scenario: Entrada correcta

- **WHEN** una persona introduce un email y contraseña correctos y pulsa «Entrar»
- **THEN** el botón pasa a «Entrando…» y queda desactivado mientras se envía, y después ve su perfil

#### Scenario: Credenciales incorrectas

- **WHEN** una persona introduce un email o una contraseña que no corresponden a ninguna cuenta
- **THEN** ve un aviso general en rojo con «El email o la contraseña no son correctos.», sin marcar ningún campo concreto

#### Scenario: Campos vacíos

- **WHEN** una persona pulsa «Entrar» con los dos campos vacíos
- **THEN** el navegador no bloquea el envío y aparecen «Falta rellenar el email.» bajo Email y «Falta rellenar la contraseña.» bajo Contraseña

### Requirement: Mensajes de error de los formularios

Los formularios de registro e inicio de sesión SHALL mostrar los errores en castellano. Los errores de validación que corresponden a campos visibles SHALL aparecer bajo su campo; si todos los errores devueltos corresponden a campos visibles, SHALL NOT mostrarse aviso general. Si alguno no corresponde a un campo visible, SHALL aparecer además un aviso general encima del formulario con el mensaje del primer error. Cualquier otro error SHALL aparecer como aviso general. Al volver a enviar, los errores del envío anterior SHALL desaparecer. Cualquier rechazo `400` del servidor se presenta como credenciales incorrectas y cualquier estado de error distinto de `400`, `401` y `422` (con errores) como error inesperado del servidor. Los textos SHALL ser:

- email ya registrado: «Ese email ya está registrado. Inicia sesión en su lugar.»
- contraseñas distintas: «Las contraseñas no coinciden.»
- email sin formato válido: «Introduce una dirección de email válida.»
- campo obligatorio vacío: «Falta rellenar el email.», «Falta rellenar la contraseña.», etc.
- longitud mínima: «la contraseña debe tener al menos 8 caracteres.» (con el nombre del campo en minúscula al inicio)
- longitud máxima: «la contraseña no puede superar los 32 caracteres.» (ídem)
- credenciales incorrectas: «El email o la contraseña no son correctos.»
- regla de validación sin texto propio: «Revisa el campo.» (con el nombre del campo, p. ej. «Revisa el email.»)
- servidor inaccesible: «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.»
- error inesperado del servidor: «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.»

#### Scenario: Servidor apagado

- **WHEN** una persona envía el formulario de inicio de sesión o de registro y el servidor no responde
- **THEN** ve el aviso general «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y el botón vuelve a estar activo

#### Scenario: Error interno del servidor

- **WHEN** el servidor responde a un envío del formulario con un error que no es `400`, `401` ni `422` (por ejemplo, un 5xx)
- **THEN** la persona ve el aviso general «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.»

#### Scenario: Email con formato inválido

- **WHEN** una persona envía «nope» como email en cualquiera de los dos formularios
- **THEN** aparece «Introduce una dirección de email válida.» bajo el campo Email

#### Scenario: Reintento

- **WHEN** una persona corrige un formulario que mostraba errores y lo vuelve a enviar
- **THEN** los errores del envío anterior desaparecen en cuanto empieza el nuevo envío; si había un aviso de sesión perdida en el inicio de sesión, ese aviso vuelve a mostrarse mientras se envía y solo desaparece si la entrada tiene éxito

### Requirement: Persistencia de la sesión en el navegador

La aplicación web SHALL recordar la sesión en el navegador tras registrarse o iniciar sesión, de modo que siga abierta al recargar o volver más tarde. Al abrir la aplicación con una sesión recordada SHALL comprobarla con el servidor antes de mostrar ninguna pantalla, mostrando entretanto un indicador de carga. El motivo por el que no se pudo restaurar la sesión SHALL mostrarse solo en la pantalla de inicio de sesión, nunca en la de registro.

#### Scenario: Recarga con sesión válida

- **WHEN** una persona con sesión abierta recarga la página del perfil
- **THEN** ve brevemente un indicador de carga y después su perfil, sin tener que volver a entrar

#### Scenario: Sesión rechazada por el servidor

- **WHEN** la aplicación se abre con una sesión recordada que el servidor ya no acepta
- **THEN** la sesión se olvida, la persona acaba en la pantalla de inicio de sesión y ve el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.»

#### Scenario: Servidor inaccesible al abrir la aplicación

- **WHEN** la aplicación se abre con una sesión recordada y el servidor no responde o la rechaza con un error distinto de `401` (por ejemplo, un 5xx)
- **THEN** la persona acaba en la pantalla de inicio de sesión con el aviso correspondiente («No se pudo conectar con el servidor…» o «Algo ha ido mal en el servidor…»), pero la sesión no se olvida: al recargar con el servidor disponible vuelve a entrar sin introducir credenciales

#### Scenario: Aviso de sesión frente a error del formulario

- **WHEN** la pantalla de inicio de sesión muestra un aviso de sesión perdida y la persona envía el formulario con un error
- **THEN** el aviso general muestra el error del envío en lugar del de la sesión perdida; si el envío tiene éxito, el aviso de sesión desaparece

### Requirement: Pantalla de perfil

La pantalla de perfil SHALL mostrar un círculo con las iniciales de la persona, su nombre completo (o «Sin nombre» si no tiene), su email, la fila «Miembro desde» con la fecha de alta en formato largo en castellano (p. ej. «4 de octubre de 2026») y el botón «Cerrar sesión».

#### Scenario: Perfil con nombre

- **WHEN** una persona registrada como «Ada Byron Lovelace» abre su perfil
- **THEN** ve el círculo «AB», el nombre «Ada Byron Lovelace», su email y la fecha en que se registró

#### Scenario: Perfil sin nombre

- **WHEN** una persona registrada sin nombre abre su perfil
- **THEN** ve «Sin nombre» en el lugar del nombre y las iniciales calculadas a partir de su email

### Requirement: Cierre de sesión desde la web

Al pulsar «Cerrar sesión», la aplicación web SHALL olvidar la sesión en el navegador y llevar a la persona a la pantalla de inicio de sesión de inmediato, y SHALL pedir al servidor que revoque la sesión sin esperar su respuesta ni mostrar errores si falla.

#### Scenario: Cierre de sesión

- **WHEN** una persona pulsa «Cerrar sesión» en su perfil
- **THEN** acaba en la pantalla de inicio de sesión sin ningún aviso, y al recargar sigue sin sesión

#### Scenario: Cierre con el servidor inaccesible

- **WHEN** una persona pulsa «Cerrar sesión» y el servidor no responde
- **THEN** la sesión se cierra igualmente en el navegador y no se muestra ningún error
