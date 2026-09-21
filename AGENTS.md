# AGENTS.md — FlowSync

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
- No introducir dependencias nuevas sin justificarlas en el PR.
