# Spec Delta

## MODIFIED Requirements

### Requirement: Navegación según la sesión en la web

La aplicación web SHALL tener cinco pantallas: inicio de sesión, registro, lista de tareas, pantalla de una tarea y perfil.
- Sin sesión, solo SHALL mostrar las de inicio de sesión y registro.
- Con sesión, solo SHALL mostrar la lista de tareas, la pantalla de una tarea y el perfil, y la lista SHALL ser la de inicio.
- Cualquier otra dirección SHALL llevar a tareas, o al inicio de sesión si no hay sesión.
- Mientras comprueba una sesión guardada, SHALL mostrar un indicador de carga en lugar de redirigir.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre el perfil, la lista de tareas o la pantalla de una tarea
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

#### Scenario: Volver de una tarea a la lista

- **WHEN** una persona está en la pantalla de una tarea y pulsa «Volver a la lista»
- **THEN** vuelve a la lista de tareas
