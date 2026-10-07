# Proposal

## Why

FlowSync todavía no gestiona tareas: solo hay cuentas y acceso. Sin una lista compartida de tareas, el producto no puede responder su pregunta central, «quién está en qué». Este change introduce el sustrato mínimo sobre el que se apoyan el resto de historias de E2 y E3: una lista única con título, responsable y estado, en la que se crea con solo un título y se cambia el estado sin salir de la lista.

Alcance: cinco historias del backlog.
- E3-1, lista compartida.
- E2-1, crear tarea con solo el título.
- E2-2, título obligatorio.
- E2-3, nace mía y pendiente.
- E2-4, cambiar el estado desde la lista.

## What Changes

- **Nueva entidad tarea**:
  - Tiene un título, un estado y una persona responsable.
  - El estado pertenece a un conjunto cerrado de tres valores: `pending`, `in_progress` y `done`. En pantalla se muestran como «Pendiente», «En curso» y «Hecho».
  - No tiene fecha de vencimiento, ni siquiera preparada.
- **API de tareas**, exactamente tres operaciones bajo `/api/v1`, todas con sesión iniciada:
  - Listar todas las tareas.
  - Crear una tarea. Solo se envía el título; nace en `pending` y con quien la crea como responsable.
  - Actualizar una tarea: título, estado y/o responsable.
  - No hay lectura individual, ni borrado, ni endpoints de equipo.
- **Validación**:
  - El título es obligatorio, se recorta y no puede quedar en blanco.
  - El título admite como máximo 255 caracteres. Si se pasa, se rechaza; nunca se recorta en silencio.
  - Cualquier estado fuera de los tres valores se rechaza con `422`, igual que un responsable que no es una persona registrada.
- **Pantalla «Tareas» en la web**, nueva ruta protegida, que pasa a ser el inicio de la aplicación:
  - Formulario de creación con un único campo, el título.
  - Una fila por tarea con el título, el nombre del responsable (o «Sin nombre») y el estado.
  - El estado se cambia desde la propia fila, sin abrir nada ni confirmar.
  - Hay un estado vacío que invita a crear la primera tarea.
  - Enlaces mínimos entre Tareas y Perfil.
- **Lista compartida**: una sola lista, idéntica para todos. Cualquiera puede cambiar el estado, el título y el responsable de cualquier tarea. No hay tareas privadas, ni vista «mis tareas», ni señales de presencia.
- **Cambio de navegación (modifica `auth`)**: tras iniciar sesión o registrarse se aterriza en Tareas, no en Perfil. Las direcciones desconocidas y las pantallas de acceso abiertas con sesión también llevan a Tareas.

Fuera de alcance:
- Interfaz para reasignar responsable o editar el título. La API lo permite, pero sin endpoints de equipo la web no tiene de dónde sacar las personas, y E2 «reasignar» y «editar título» son historias aparte.
- Borrar tareas y abrir una tarea.
- Fechas de vencimiento.
- Filtro por estado.
- Lista que se refresca sola (E3-2).
- Tests: este change no monta base de pruebas ni escribe tests.

## Capabilities

### New Capabilities

- `tasks`: la lista compartida de tareas del equipo. Cubre el modelo observable de una tarea (título, estado y responsable), la API para listar, crear y actualizar, sus reglas de validación y la pantalla web de la lista con creación y cambio de estado.

### Modified Capabilities

- `auth`: cambia el destino de la navegación. Al iniciar sesión, al registrarse, al abrir una dirección desconocida o al abrir login o registro con sesión, se llega a la lista de tareas en vez de al perfil. El perfil gana un enlace a Tareas.

## Puntos abiertos

- **Orden de la lista (PA-3).** No hay regla de orden decidida. Este change no ordena explícitamente, ni en la API ni en la web, y no inventa ningún criterio. La promesa de «enumerar el trabajo de cada persona» (E3-1 CA-5) sigue débil con muchas tareas hasta que se decida.
- **Transiciones de estado (PA-7).** Se dejan libres: desde cualquier estado se puede ir a cualquiera de los otros dos, incluido volver desde «Hecho». Queda abierto si hace falta proteger el paso a «Hecho», que es muy barato de hacer por error.
- **Umbral del título (PA-9).** Se fija en 255 caracteres como decisión de este change. El umbral es revisable; la conducta de avisar y no recortar no lo es.
- **Reasignación y edición sin interfaz.** La API acepta título y responsable al actualizar, pero la web solo ofrece el estado. La interfaz llegará con las historias de reasignar (RF-10) y editar (RF-11), que necesitan una forma de listar personas.
- **Ediciones simultáneas (PA-8).** Si dos personas cambian la misma tarea a la vez, gana la última escritura de cada campo. La lista no se refresca sola, así que cada persona ve lo que había al cargarla, más sus propios cambios.
- **Cuántas tareas «En curso» por persona (PA-4).** No se limita.

## Impact

- **Backend**:
  - Migración nueva de la tabla de tareas, con un estado restringido a tres valores y una clave foránea al usuario responsable. Regenera `database/schema.ts`.
  - Modelo, validadores, transformer y controlador de tareas.
  - Tres rutas nuevas en el grupo autenticado de `/api/v1`.
  - Regeneración de `.adonisjs/` (controladores y registro Tuyau), que se commitea.
- **Frontend**:
  - Tres llamadas nuevas en el cliente de API.
  - Tipos de tarea.
  - Página de Tareas que reutiliza `Card`, `Button`, `Input`, `Label`, `Alert` y `FieldError`.
  - Nueva ruta protegida y cambio de los destinos de redirección.
  - Enlace entre Perfil y Tareas.
- **Sin dependencias nuevas** en ninguna de las dos capas.
- **Sin cambios** en los endpoints de cuentas.
