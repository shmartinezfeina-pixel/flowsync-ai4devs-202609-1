# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

FlowSync es una aplicación de gestión de tareas en equipo, ejercicio del curso AI4Devs. Monorepo con backend (AdonisJS 7 + SQLite) y frontend (React 19 + Vite) independientes.

## Comandos

### Backend (`cd backend/`)

```bash
npm run dev        # Dev server con HMR en http://localhost:3333
npm run build      # Build de producción
npm test           # Tests unitarios y funcionales (Japa)
npm run lint       # ESLint
npm run format     # Prettier
npm run typecheck  # Type-check sin emitir

node ace migration:run   # Aplicar migraciones de base de datos
node ace generate:key    # Generar APP_KEY para .env
```

### Frontend (`cd frontend/`)

```bash
npm run dev      # Dev server con HMR en http://localhost:5173
npm run build    # tsc + vite build
npm run lint     # Oxlint
npm run preview  # Preview del build de producción
```

### Setup inicial (primera vez)

```bash
# Backend
cd backend && npm install
cp .env.example .env
node ace generate:key   # Copiar el valor generado en .env como APP_KEY
node ace migration:run

# Frontend
cd frontend && npm install
```

## Arquitectura

### Backend (AdonisJS 7)

- `app/controllers/` — Controladores HTTP: `access_tokens_controller.ts` (login/logout), `new_account_controller.ts` (signup), `profile_controller.ts`
- `app/models/` — Modelos Lucid ORM (`user.ts`)
- `app/validators/` — Validación de entrada
- `app/transformers/` — Serialización de respuestas
- `app/middleware/` — Middleware de request
- `start/routes.ts` — Definición de rutas (prefijo `/api/v1`)
- `start/kernel.ts` — Registro de middleware
- `database/migrations/` — Migraciones SQLite
- `config/` — Configuración de auth, CORS, sesión, shield, base de datos
- `tests/unit/` y `tests/functional/` — Tests con Japa

Los path aliases del backend usan el formato `#controllers/*`, `#models/*`, etc. (definidos en `adonisrc.ts`).

### Frontend (React 19 + Vite)

- `src/main.tsx` — Entry point de React
- `src/App.tsx` — Componente raíz
- Linter: Oxlint (más rápido que ESLint, basado en Rust), configurado en `.oxlintrc.json`

### API Routes

Todas las rutas llevan el prefijo `/api/v1`:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/signup` | Crear cuenta |
| POST | `/auth/login` | Obtener access token |
| GET | `/account/profile` | Perfil del usuario (requiere auth) |
| POST | `/account/logout` | Revocar token (requiere auth) |
| GET | `/` | Health check |

### Stack técnico

- **Backend**: AdonisJS 7, TypeScript, Lucid ORM, better-sqlite3, @adonisjs/auth, Japa (tests), ESLint + Prettier
- **Frontend**: React 19, Vite 8, TypeScript, Oxlint
- **Base de datos**: SQLite local (archivo creado automáticamente al migrar)

## Flujo de trabajo del curso

El ejercicio pide entregar mediante PR al repo upstream con:
- `docs/harness/comparacion.md` — Análisis comparativo
- `prompts.md` — Prompts usados durante el ejercicio

La rama de partida es `s1/start`.
