# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Quiero hacer el mvp del proyecto pero antes de empezar  necesito que hagas un resumen de 4-5 lineas donde se explique las funcionalidades que tiene el proyecto , cómo esta el modelo actual de datos sin entrar en detalles. No me propongas funcionalidades nuevas ni tampoco diseñes una solucion.
```

**Qué salió:** funcionó a la primera: resumen de lo implementado (solo auth, tablas users y access_tokens).

Resumen del estado actual de FlowSync

1. Aunque se presenta como app de gestión de tareas en equipo, hoy solo hay autenticación de usuarios. No existen tareas, proyectos ni equipos.
2. Funcionalidades: registro (signup), login con token de acceso, consulta del perfil del usuario autenticado y logout. Las cuatro están bajo /api/v1.
3. El frontend (React) tiene tres pantallas: registro, login y perfil. Usa rutas protegidas y guarda el token en localStorage.
4. Modelo de datos (SQLite): dos tablas. users guarda nombre, email único y contraseña hasheada. access_tokens guarda los tokens de sesión opacos de cada usuario.
5. El único modelo de dominio es User, y sus columnas salen del esquema que se genera a partir de las migraciones.

En docs/prd/ hay un PRD que no he leído, porque este resumen recoge solo lo que ya está implementado.

## Prompt 2

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Partimos de esta verdad de negocio:«Quiero que FlowSync sea una herramienta para que los equipos remotos sepan en qué está trabajando cada uno sin tener que hacer reuniones de sincronización. Algo tipo tareas compartidas pero más en tiempo real y menos rollo que Jira.»
```

**Qué salió:** lo interrumpí: no decía qué hacer con la verdad de negocio; lo relancé ampliado en el prompt 3.


## Prompt 3

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
 Partimos de esta verdad de negocio:
 «Quiero que FlowSync sea una herramienta para que los equipos remotos sepan en qué está trabajando cada uno sin tener que hacer reuniones de sincronización. Algo tipo tareas compartidas pero más en tiempo real y menos rollo que Jira.» 
 
 Quiero que me hagas una sola ronda con solo 5 preguntas que reduzcan la incertidumbre del problema, los usuarios y el alcance.
 NO bajes al modelo de datos ni tampoco a los endpoints. Solo vamos a definir a alto nivel que funcionalidades va a cubrir.
```

**Qué salió:** funcionó: 5 preguntas sobre problema, usuarios, tiempo real, mínimo de una tarea y alcance.

Aquí tienes las 5 preguntas. Cada una incluye un ejemplo de las respuestas posibles:
1. Problema: ¿qué información sustituye a la reunión? ¿Basta con ver en qué tarea está cada persona ahora? ¿O también hace falta lo que hizo, lo que hará después y si está bloqueada, como un daily asíncrono?
2. Usuarios: ¿quién la usa y cómo es el equipo? ¿Es un único equipo pequeño (unas 5–10 personas) donde todos tienen el mismo rol? ¿O hay varios equipos, o un rol de responsable/manager que mira el conjunto y otro de miembro que actualiza su estado?
3. "Tiempo real": ¿qué significa en la práctica? ¿Los cambios deben aparecer al instante en la pantalla de los demás, sin recargar? ¿Basta con que la información esté al día cuando alguien entra a mirarla? ¿Hace falta avisar a alguien (notificaciones) cuando algo cambia?
4. "Tareas compartidas, menos rollo que Jira": ¿cuál es el mínimo de una tarea? ¿Basta con título, responsable y estado (pendiente / en curso / hecha)? ¿O el equipo echaría en falta prioridades, fechas, comentarios o varios tableros o proyectos? ¿Qué parte de Jira queréis evitar expresamente?
5. Alcance del MVP: ¿cuándo lo daréis por bueno y qué queda fuera? ¿Qué tendría que poder hacer un equipo remoto el primer día para dejar de hacer la reunión de sincronización? ¿Y qué queda explícitamente fuera de esta versión (integraciones con Slack o GitHub, historial o métricas, zonas horarias, móvil…)?

## Prompt 4

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
 Aqui te paso las respuestas de negocio que cubrirán algunas de tus preguntas y tambien lo que quedará fuera del alcance:
- Qué duele hoy: la daily de sincronización y el "¿en qué estás?" constante por Slack/chat. Nadie ve el estado del equipo sin interrumpir a alguien.
- Quién cobra el valor: los pares, no un lead. No hay reporte hacia arriba y a un manager le daría igual. Duele a los dos devs que descubren tarde que iban a lo mismo, y al que interrumpe a otro para preguntar.
- Episodio concreto: dos personas del equipo tocaron el mismo módulo la misma semana porque una empezó sin que la otra lo supiera. Dos días perdidos.
- Qué reunión desaparece (respuesta honesta, no la vendas de más): la daily NO desaparece entera. Desaparece la ronda de "¿en qué estás?", que hoy se come la mitad de los 15 minutos. La parte de bloqueos sigue, y este MVP no la resuelve.
- Usuarios / equipo: equipos remotos pequeños, 3–10 personas. Roles planos: en el MVP todos ven y editan lo mismo, sin jerarquía de permisos.
- Primer usuario concreto: equipo de 6 personas de producto SaaS, en 3 husos horarios, que hoy usa un gestor de tareas pesado y una daily de 15 minutos por videollamada. Es un CASO DE ESTUDIO, no un cliente real.
- Fronteras: un espacio único compartido, sin entidad "equipo". Varios equipos separados, o gente en más de uno, queda FUERA del MVP: se anota como supuesto en el PRD, no se construye.
- "Tiempo real" = ver los cambios de estado de las tareas sin refrescar ni preguntar. NO es chat, NO es videollamada, NO es colaboración simultánea sobre el mismo documento.
- Es frescura, no presencia: el estado es de la TAREA, no de la persona. Nada de "quién está conectado ahora" ni indicadores de actividad; eso es vigilancia y lo rechazamos a propósito.
- Forma de la señal: resumen que espera, no aviso que interrumpe. El caso es "llego por la mañana o vuelvo de una reunión y veo qué se ha movido". Sin notificaciones push.
- Qué decisión cambia: no empezar algo que otra persona ya está tocando, y elegir lo siguiente sabiendo qué está libre. Si la única respuesta fuera "sentirse informado", el tiempo real no valdría lo que cuesta.
- De dónde sale el estado: lo teclea la persona que hace la tarea, en segundos. Derivarlo de señales externas (Git/PRs, CI, calendario) está FUERA del MVP: es otro producto, con integraciones y OAuth de terceros.
- Por qué se sostiene: no porque sea más agradable, sino porque son dos clics sobre una lista ya abierta, sin campos obligatorios, sin decidir sprint ni estimación. Y quien lo escribe cobra en el momento: esa misma lista es su cola de trabajo, la mira para decidir qué coge, y de paso deja de recibir interrupciones preguntándole cómo va. Si el beneficio fuera solo para los demás, no lo escribiría.
- Si la información se queda vieja: el producto pierde el sentido, y lo asumo. Es el riesgo #1 a validar, no un detalle. La mitigación es que actualizar cueste dos clics, no obligar a nadie.
- Es donde se hace el trabajo, no donde se cuenta: sustituye al gestor de tareas, no convive con él. FlowSync crea las tareas, no lee las de otro sitio. Convivir exigiría doble actualización, que es como muere esta categoría.
- Renuncia explícita a sprints, estimaciones, épicas, backlog priorizado e informes. Un equipo que necesite eso no es nuestro usuario.
- "Menos rollo que Jira" = crear una tarea y cambiarle el estado en segundos, sin flujos de configuración ni campos obligatorios. Lo mínimo para saber quién está en qué.
- Qué necesita una tarea en el MVP: título, responsable, estado y fecha de vencimiento. La fecha, para ver de un vistazo qué se ha pasado de plazo.
- Cómo se consume la lista: filtrando por estado, para centrarse en lo pendiente.
- Éxito para el usuario: dejar de hacer la ronda de "¿en qué estás?" de la daily porque el estado del equipo se ve de un vistazo.
- Criterio a una semana de uso real: que el equipo cancele esa ronda y nadie pida que vuelva. Si la siguen haciendo igual, no funcionó.
- Cuánto construir: una vertical fina y usable de punta a punta, no el andamiaje amplio de un producto. Prefiero una capability terminada a tres a medias.

- Fuera del MVP: notificaciones push, integración con Slack, roles/permisos avanzados, analítica/reporting, comentarios en tareas.

No hagas más preguntas 
```

**Qué salió:** funcionó: devolvió un alcance funcional con incluido, fuera, supuestos, riesgo y criterio de éxito.

## Prompt 5

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Ahora quiero que me hagas el MVP de proyecto estructurado en 5 bloques: Problema, Usuarios, Propuesta de valor, Alcance y NO Alcance. Quiero que seas agresiva recortando lo que aporte menos valor . Hay que sacar un producto que cubra al 100% con las necesidades básicas de negocio y que sea funcional para los usuarios. No quiero que en el MVP tenga modelo de datos, ni diagramas , ni casos de uso, ni requisitos. Tampo utilices tablas, ni endpoints, ni nada de arquitectura
```

**Qué salió:** funcionó: MVP en 5 bloques; recortó el resumen de cambios, el borrado de tareas y el historial.

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

docs/prd/alcance-mvp-sml.md está vacío. Si quieres, vuelco este contenido ahí cuando salgamos del modo plan.


MVP de FlowSync

1. Problema

En un equipo remoto nadie ve en qué está cada compañero sin interrumpirle. Esto cuesta en tres sitios:

- La daily: la ronda de "¿en qué estás?" se come la mitad de los 15 minutos.
- El chat: la gente pregunta "¿cómo va?" constantemente.
- El trabajo duplicado: dos personas empiezan lo mismo sin saberlo. En el caso de referencia, eso fueron dos días perdidos.

La parte de bloqueos de la daily sigue existiendo, y este MVP no la resuelve.

2. Usuarios

- Los compañeros de un equipo remoto pequeño (3–10 personas), repartidos en varios husos horarios.
- Todos tienen el mismo rol: todos ven y editan lo mismo.
- Ganan dos perfiles: el que iba a empezar algo que otro ya estaba tocando, y el que hoy tiene que interrumpir para preguntar.
- No hay manager ni reporte hacia arriba.
- Caso de estudio: un equipo SaaS de 6 personas en 3 husos horarios, que hoy usa un gestor de tareas pesado y una daily por videollamada.

3. Propuesta de valor

Una lista de tareas compartida donde se ve de un vistazo quién está en qué y qué está libre, siempre al día y sin preguntar a nadie.

- Actualizarla cuesta dos clics.
- Quien la actualiza también gana: esa lista es su propia cola de trabajo y deja de recibir interrupciones.
- Sustituye al gestor de tareas del equipo, no convive con él.
- Éxito: tras una semana de uso real, el equipo cancela la ronda de "¿en qué estás?" y nadie pide que vuelva.

4. Alcance

1. Entrar. Registro, login y logout (ya existen). Todos los usuarios comparten un único espacio de trabajo.
2. Crear una tarea en segundos. Solo el título es obligatorio; opcionalmente lleva responsable, estado y fecha de vencimiento.
3. Moverla en dos clics. Cambiar el estado y el responsable directamente desde la lista, sin abrir formularios. "Me la quedo" es asignarse una tarea libre.
4. Ver al equipo de un vistazo. Una sola lista con todas las tareas: responsable, estado y fecha. Las tareas vencidas se distinguen visualmente y la lista se puede filtrar por estado.
5. Siempre al día. Los cambios de los demás aparecen en la lista sin recargar la página.

Los estados son tres y fijos: pendiente, en curso y hecha. El equipo no los puede configurar.

5. NO Alcance

Recortado por aportar menos valor que lo que cuesta:
- Un resumen específico de "qué ha cambiado desde tu última visita". La lista actualizada ya responde a esa pregunta.
- Borrar tareas. Una tarea que sobra se marca como hecha.
- Filtros más allá del estado, búsqueda y ordenaciones configurables.
- Descripción, etiquetas, prioridad o adjuntos en la tarea.
- Historial de cambios de una tarea.

Excluido por decisión de negocio:
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

Riesgo n.º 1 a validar: que el estado se quede viejo. La mitigación es que actualizar cueste dos clics, no obligar a nadie.


## Prompt 6

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Guarda este MVP en la carpeta docs/prd/alcance-mvp-sml.md
```

**Qué salió:** funcionó a la primera.

## Prompt 7

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Guarda en el fichero prompts.md todos los promtps utilizados en esta sesion, siguiendo el formato que indica el propio documento.
```

**Qué salió:** este mismo fichero.
