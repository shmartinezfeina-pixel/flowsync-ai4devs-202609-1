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

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI) — `/init`

```
/init
```

**Qué salió:** Generó CLAUDE.md con arquitectura, comandos y flujo de trabajo del curso a la primera.

---

## Prompt 2

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
commit this
```

**Qué salió:** Falló por firma GPG (pinentry cancelado). Tuve que lanzar el commit manualmente.

---

## Prompt 3

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI) — comando directo

```
git commit -m "docs: añade CLAUDE.md con guía de arquitectura y comandos"
```

**Qué salió:** Commit creado correctamente.

---

## Prompt 4

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
haz un push con el cambio
```

**Qué salió:** Push a origin/s1/start sin problemas.

---

## Prompt 5

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
comprueba que puedes leer la tarea FLOW-2 del Jira en el espacio FlowSync
```

**Qué salió:** Pidió autenticación OAuth con Atlassian. Tuve que lanzar `/mcp` primero.

---

## Prompt 6

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI) — tras autenticar con `/mcp`

```
comprueba que puedes leer la tarea FLOW-2 del Jira en el espacio FlowSync
```

**Qué salió:** Leyó FLOW-2 correctamente y mostró el resumen de la tarea.

---

## Prompt 7

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
crea un ficheero AGENTS.md que contenga esto : # AGENTS.md — FlowSync

## Overview
Monorepo: `backend/` (AdonisJS 7, API) + `frontend/` (React 19 + Vite).
Auth con access tokens. SQLite (better-sqlite3) + Lucid ORM.

## Stack y convenciones
- **Migration-first**: el esquema se genera. NUNCA editar `database/schema.ts`
  a mano; crear migración y correr `node ace migration:run`.
- **Transformers**: la salida de la API pasa por un `*Transformer` (BaseTransformer,
  `toObject()` con `this.pick(...)`). No serializar el modelo directo.
- **Validación**: VineJS en `#validators/*`. No validar a mano en el controller.
- **Controllers**: la base usa controllers generados (`#generated/controllers`).
- **Fechas**: Luxon `DateTime`. **Lint/format**: ESLint + Prettier.

## Comandos clave
- `node ace migration:run`  — aplica migraciones
- `npm run test`            — suite de tests del backend
- `npm run lint`            — ESLint + Prettier

## Gotchas
- Auth por access tokens (`@adonisjs/auth`); el perfil se sirve por transformer.
- No introducir dependencias nuevas sin justificarlas en el PR. y luego dentro del fichero de Claude.md crea un symlink hacia este fichero AGENTS.md
```

**Qué salió:** Creó AGENTS.md y añadió `@AGENTS.md` en CLAUDE.md a la primera.

---

## Prompt 8

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
commit y push
```

**Qué salió:** Commit y push de AGENTS.md + CLAUDE.md actualizado sin problemas.

---

## Prompt 9

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
implementa la tarea FLOW-2
```

**Qué salió:** Implementó login, registro y perfil (11 ficheros). El agente corrigió solo un error de TypeScript (`noUnusedLocals`). No hubo que intervenir.

---

## Prompt 10

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
commit y push
```

**Qué salió:** Commit y push de los 11 ficheros de FLOW-2 sin problemas.

---

## Prompt 11

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
Ahora quiero que me digas cada uno de estos puntos:
Qué archivos tocó, contados.
Qué convenciones del proyecto respetó y cuáles no, nombrándolas una a una. Si en un lado no había ninguna escrita en ninguna parte, esa es la respuesta y vale.
Cuántas veces tuviste que intervenir: corregir, aclarar, repetir el encargo o pararlo en seco.
Qué te tocaría arreglar a mano antes de enseñarle eso a alguien de tu equipo.
```

**Qué salió:** Retrospectiva en cuatro puntos. Detectó que shadcn/ui no se usó pese a pedirse en el ticket.

---

## Prompt 12

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
Guarda esta notas en un fichero en la carpeta docs/hardness/comparacion.md, sino está crealo
```

**Qué salió:** Creó el directorio y el fichero con las notas de la retrospectiva.

---

## Prompt 13

**Modelo:** Claude Sonnet 4.6
**Herramienta:** Claude Code (CLI)

```
Ahora quiero que en fichero prompts.md, en la raiz del proyecto,se guarden todos los prompts que hecho durante esta sesion
```

**Qué salió:** Este fichero.
