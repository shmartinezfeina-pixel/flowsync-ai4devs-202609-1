
# El terreno que ya existe (3-5 líneas).
    Aunque se presenta como app de gestión de tareas en equipo, hoy solo hay autenticación de usuarios. No existen tareas, proyectos ni equipos.
    Funcionalidades: registro (signup), login con token de acceso, consulta del perfil del usuario autenticado y logout. Las cuatro están bajo /api/v1.
    El frontend (React) tiene tres pantallas: registro, login y perfil. Usa rutas protegidas y guarda el token en localStorage.
    Modelo de datos (SQLite): dos tablas. users guarda nombre, email único y contraseña hasheada. access_tokens guarda los tokens de sesión opacos de cada usuario.
    El único modelo de dominio es User, y sus columnas salen del esquema que se genera a partir de las migraciones.

# El interrogatorio,con las respuestas ya decididas.

1. Problema: ¿qué información sustituye a la reunión? ¿Basta con ver en qué tarea está cada persona ahora? ¿O también hace falta lo que hizo, lo que hará después y si está bloqueada, como un daily asíncrono?
2. Usuarios: ¿quién la usa y cómo es el equipo? ¿Es un único equipo pequeño (unas 5–10 personas) donde todos tienen el mismo rol? ¿O hay varios equipos, o un rol de responsable/manager que mira el conjunto y otro de miembro que actualiza su estado?
3. "Tiempo real": ¿qué significa en la práctica? ¿Los cambios deben aparecer al instante en la pantalla de los demás, sin recargar? ¿Basta con que la información esté al día cuando alguien entra a mirarla? ¿Hace falta avisar a alguien (notificaciones) cuando algo cambia?
4. "Tareas compartidas, menos rollo que Jira": ¿cuál es el mínimo de una tarea? ¿Basta con título, responsable y estado (pendiente / en curso / hecha)? ¿O el equipo echaría en falta prioridades, fechas, comentarios o varios tableros o proyectos? ¿Qué parte de Jira queréis evitar expresamente?
5. Alcance del MVP: ¿cuándo lo daréis por bueno y qué queda fuera? ¿Qué tendría que poder hacer un equipo remoto el primer día para dejar de hacer la reunión de sincronización? ¿Y qué queda explícitamente fuera de esta versión (integraciones con Slack o GitHub, historial o métricas, zonas horarias, móvil…)?

# el alcance que me dio sin formato 
Alcance funcional del MVP de FlowSync

Problema. La ronda de "¿en qué estás?" se come la mitad de la daily, y fuera de ella la gente se interrumpe por chat para preguntarlo. Además, dos personas pueden empezar lo mismo sin enterarse. El MVP ataca solo esa ronda; los bloqueos quedan fuera.

Usuario. Los compañeros de un equipo remoto pequeño (3–10 personas, varios husos horarios), sin jerarquía. Caso de estudio: un equipo SaaS de 6 personas en 3 husos horarios.

Funcionalidades incluidas (una vertical fina, de punta a punta)

1. Acceso al espacio compartido. Registro, login y logout (ya existen). Todo usuario autenticado entra en el mismo espacio, con los mismos permisos.
2. Crear una tarea en segundos. Tiene título, responsable, estado y fecha de vencimiento. No hay flujos de configuración, sprints ni estimaciones.
3. Actualizar el estado en dos clics desde la propia lista, sin abrir formularios. También se puede reasignar el responsable.
4. Lista compartida del equipo. Muestra de un vistazo quién está en qué y qué está libre, se filtra por estado y marca las tareas que han pasado su fecha de vencimiento. Es a la vez la cola de trabajo de cada uno.
5. Frescura sin refrescar. Los cambios de estado de los demás aparecen en la lista sin recargar la página. No hay presencia, ni indicadores de actividad, ni notificaciones push.
6. "Qué se ha movido". Al volver a la lista (por la mañana o tras una reunión) se ve qué ha cambiado. Es un resumen que espera a que lo mires, no un aviso que interrumpe. Si hubiera que recortar, esta es la pieza a simplificar primero.

Fuera del MVP

- Notificaciones push e integración con Slack.
- Roles y permisos avanzados.
- Analítica e informes.
- Comentarios en las tareas.
- Varios equipos o espacios; que una persona esté en más de un equipo queda anotado como supuesto.
- Estado derivado de Git, CI o el calendario.
- Sprints, estimaciones, épicas y backlog priorizado.
- Presencia de quién está conectado.
- Chat y edición simultánea.
- Convivir con otro gestor de tareas.

Supuestos y riesgos

- Supuesto: un único espacio compartido. Nadie pertenece a varios equipos.
- Supuesto: estados del flujo. El conjunto es corto y fijo (tipo pendiente / en curso / hecha); no lo configura el usuario.
- Supuesto: solo el título es obligatorio. Así se cumple "sin campos obligatorios": responsable, estado y fecha tendrían valores por defecto o serían opcionales.
- Riesgo n.º 1: que el estado se quede viejo. Se mitiga haciendo que actualizar cueste dos clics, no obligando a nadie.

Criterio de éxito: tras una semana de uso real, el equipo cancela la ronda de "¿en qué estás?" de la daily y nadie pide que vuelva.

# MVP de FlowSync
## 1. Problema

En un equipo remoto nadie ve en qué está cada compañero sin interrumpirle. Esto cuesta en tres sitios:

- **La daily:** la ronda de "¿en qué estás?" se come la mitad de los 15 minutos.
- **El chat:** la gente pregunta "¿cómo va?" constantemente.
- **El trabajo duplicado:** dos personas empiezan lo mismo sin saberlo. En el caso de referencia, eso fueron dos días perdidos.

La parte de bloqueos de la daily sigue existiendo, y este MVP no la resuelve.

## 2. Usuarios

- Los compañeros de un equipo remoto pequeño (3–10 personas), repartidos en varios husos horarios.
- Todos tienen el mismo rol: todos ven y editan lo mismo.
- Ganan dos perfiles: el que iba a empezar algo que otro ya estaba tocando, y el que hoy tiene que interrumpir para preguntar.
- No hay manager ni reporte hacia arriba.
- Caso de estudio: un equipo SaaS de 6 personas en 3 husos horarios, que hoy usa un gestor de tareas pesado y una daily por videollamada.

## 3. Propuesta de valor

Una lista de tareas compartida donde se ve de un vistazo quién está en qué y qué está libre, siempre al día y sin preguntar a nadie.

- Actualizarla cuesta dos clics.
- Quien la actualiza también gana: esa lista es su propia cola de trabajo y deja de recibir interrupciones.
- Sustituye al gestor de tareas del equipo, no convive con él.
- Éxito: tras una semana de uso real, el equipo cancela la ronda de "¿en qué estás?" y nadie pide que vuelva.

## 4. Alcance

1. **Entrar.** Registro, login y logout (ya existen). Todos los usuarios comparten un único espacio de trabajo.
2. **Crear una tarea en segundos.** Solo el título es obligatorio; opcionalmente lleva responsable, estado y fecha de vencimiento.
3. **Moverla en dos clics.** Cambiar el estado y el responsable directamente desde la lista, sin abrir formularios. "Me la quedo" es asignarse una tarea libre.
4. **Ver al equipo de un vistazo.** Una sola lista con todas las tareas: responsable, estado y fecha. Las tareas vencidas se distinguen visualmente y la lista se puede filtrar por estado.
5. **Siempre al día.** Los cambios de los demás aparecen en la lista sin recargar la página.

Los estados son tres y fijos: pendiente, en curso y hecha. El equipo no los puede configurar.

## 5. NO Alcance

**Recortado por aportar menos valor que lo que cuesta:**

- Un resumen específico de "qué ha cambiado desde tu última visita". La lista actualizada ya responde a esa pregunta.
- Borrar tareas. Una tarea que sobra se marca como hecha.
- Filtros más allá del estado, búsqueda y ordenaciones configurables.
- Descripción, etiquetas, prioridad o adjuntos en la tarea.
- Historial de cambios de una tarea.

**Excluido por decisión de negocio:**

- Notificaciones push e integración con Slack.
- Roles y permisos avanzados.
- Analítica e informes.
- Comentarios en tareas.
- Varios equipos o espacios, o personas en más de un equipo. Queda anotado como supuesto.
- Estado derivado de Git, pull requests, CI o calendario.
- Indicadores de quién está conectado o de actividad de las personas.
- Chat, videollamada y edición simultánea.
- Sprints, estimaciones, épicas, backlog priorizado.
- Importar tareas de otras herramientas o sincronizarse con ellas.
- Resolver los bloqueos de la daily.

**Riesgo n.º 1 a validar:** que el estado se quede viejo. La mitigación es que actualizar cueste dos clics, no obligar a nadie.


🅱 Parte B: las tres líneas

- La Ia propuso 10 funcionalidades y con con el recorte que le pedi (agresivo) me quedé con 5
- Las 5 que sacó fueron:
    - Un resumen específico de "qué ha cambiado desde tu última visita". La lista actualizada ya responde a esa pregunta y no es un MUST 
    - Borrar tareas. Una tarea que sobra se marca como hecha. 
    - Filtros más allá del estado, búsqueda y ordenaciones configurables.
    - Descripción, etiquetas, prioridad o adjuntos en la tarea.
    - Historial de cambios de una tarea.
- La exclusión de la que menos segura estoy es la de la cuarta: Descripción, etiquetas, prioridad o adjuntos en la tarea. Creo que esta será muy necesaria sobre todo en una segunda fase de mejoras. La descripcion es un campo muy importante para definir y aclarar muchos aspectos a la hora de resolver una tarea
