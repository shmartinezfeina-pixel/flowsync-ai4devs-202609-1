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

---

## Prompt 1

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Con el agente adversarial-reviewer-sml quiero que trabajes sobre el requisito  «Lo que cada tarea muestra de su responsable» , que está en  openspec/specs/tasks/spec.md.Trabaja solo ese requisito , no la capacidad entera.

Quiero que hagas una matriz de trazabilidad, esta matriz mapea, escenario a escenario, si el requisito está cubierto por las pruebas.  El formato no es negociable : una fila por escenario y cuatro columnas. Encima, dos números:  cuántos escenarios tiene el requisito  y  cuántos resultaron cubiertos  — el primero se anota al empezar, el segundo al terminar.
Las columnas serán:

1- El escenario, en una línea.  Qué se espera y en qué situación. Si no cabe en una línea, es que estás juntando dos.

2- Qué prueba/test que lo cubre, con el nombre exacto que aparece en la suite.  Sin el nombre concreto, la columna va vacía:  "seguro que algo lo cubre"  no es una fila.

3- Cubierto · No cubierto · No lo sé.  Los tres estados son válidos, y el tercero no es un fallo: es el resultado más informativo de los tres.

4- Si pusiste "no lo sé", qué te faltó para decidirlo.  Medios en línea. Suele ser una de dos: no encontraste dónde se comprueba, o encontraste algo que se le parece y no dice exactamente lo mismo.

La matriz la guardarás en una carpeta nueva docs/verificacion/sml.md. Sino existe la creas

Para los tests que faltan, es decir por cada fila en No cubierto, escribe el test que falta —uno  por escenario— Los  tests que escribas  van en  backend/tests/functional/tasks/, siguiendo el estilo de los que ya hay en  backend/tests/functional/auth/. No toques nada fuera de  backend/tests/. Cuando los tengas, ejecútalos. 

Importante: cuando algún test no pase, no arregles el código ni ajustes tests para que pasen. El objetivo es saber qué está mal, no ocultarlo
```

**Qué salió:** matriz con 4 filas (el escenario «La tarea no filtra datos de cuenta» se desdobló en tarea suelta / en la lista), 0 de 4 cubiertos al empezar. 4 tests nuevos: 3 pasan y 1 falla (la lista expone el email del responsable). PR #7.

## Prompt 2 (lanzado por Claude al subagente `adversarial-reviewer-sml`)

**Modelo:** Sonnet (frontmatter del agente)
**Herramienta:** Claude Code, subagente

```
Trabaja SOLO sobre el requisito «Lo que cada tarea muestra de su responsable» de openspec/specs/tasks/spec.md (líneas ~97-115, tres scenarios: «Responsable identificable», «La tarea no filtra datos de cuenta» —que habla de tarea suelta Y dentro de la lista—, y «Responsable sin nombre»). Repo: /home/shey/CURSO-LIDR/flowsync-ai4devs-202609-1.

Necesito dos cosas, con evidencia archivo:línea:
1. Cobertura por tests: para cada scenario (y para el segundo, por separado «suelta» vs «en la lista»), busca en backend/tests/ (todas las suites) si hay algún test que lo compruebe EXACTAMENTE. Da el título literal del test si existe. Si solo hay algo parecido que no comprueba lo mismo (p. ej. tests de auth sobre initials del usuario, no del assignee de una tarea), dilo explícitamente. Clasifica: Cubierto / No cubierto / No lo sé, y si es «No lo sé», qué te faltó.
2. Intento de refutación del código: ¿qué endpoints devuelven una tarea con `assignee` (GET /api/v1/tasks, GET /api/v1/tasks/:id, POST /api/v1/tasks, PATCH :id/status, PUT :id/due-date)? Para cada uno, ¿qué transformer usa y qué campos expone del assignee? ¿Se filtra el email u otro dato de cuenta? ¿Qué iniciales salen para una cuenta sin nombre (mira User.initials en backend/app/models/user.ts) y se derivan del email? Prioriza hallazgos (crítico/alto/medio).
No edites nada. Sé conciso.
```

**Qué salió:** confirmó 0 de 4 cubiertos, sin «No lo sé». Encontró que la lista, `POST /tasks` y `PATCH /tasks/:id/status` usan `TaskTransformer` → `UserTransformer` y exponen el email del responsable. También vio que las iniciales de una cuenta sin nombre salen del email.

## Prompt 3 (lanzado por Claude al subagente `adversarial-reviewer`, revisión del PR)

**Modelo:** Sonnet (frontmatter del agente)
**Herramienta:** Claude Code, subagente

```
Revisa el PR #7 de shmartinezfeina-pixel/flowsync-ai4devs-202609-1 (rama trazabilidad-sml, base s4/start; repo local en /home/shey/CURSO-LIDR/flowsync-ai4devs-202609-1). Diff: `git diff origin/s4/start...HEAD`. Añade docs/verificacion/sml.md (matriz de trazabilidad del requisito «Lo que cada tarea muestra de su responsable» de openspec/specs/tasks/spec.md) y backend/tests/functional/tasks/assignee.spec.ts. Un test falla A PROPÓSITO (la lista expone el email del assignee): no lo cuentes como defecto del PR. Busca: tests que pasan sin probar realmente el scenario (asserts débiles, falsos positivos), afirmaciones de la matriz no respaldadas, scenarios mal desdoblados o mal contados, y desviaciones de CLAUDE.md/estilo de tests/functional/auth. Hallazgos priorizados con archivo:línea. Sé conciso.
```

**Qué salió:** sin defectos graves. Señaló asserts débiles: el responsable coincidía con quien hacía la petición, las iniciales sin nombre no se fijaban a un valor, y faltaba comprobar que el `assignee` tuviera exactamente sus campos. Se endurecieron los tests y el resultado no cambió: 3 pasan y 1 falla.

## Prompt 4

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Guardar en prompts.md todos los mensajes generados en esta sesion y no hagas commit
```

**Qué salió:** este archivo, sin commitear.
