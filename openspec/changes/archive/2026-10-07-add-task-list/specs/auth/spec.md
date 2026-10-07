# Spec Delta

## MODIFIED Requirements

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

