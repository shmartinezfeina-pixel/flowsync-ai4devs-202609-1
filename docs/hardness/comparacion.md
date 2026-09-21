# Comparación — FLOW-2 (login y registro)

## Archivos tocados: 11

6 modificados + 5 nuevos:

**Modificados:**
- `package.json`, `package-lock.json`, `vite.config.ts`
- `src/App.tsx`, `src/App.css`, `src/index.css`

**Nuevos:**
- `src/api/auth.ts`
- `src/context/AuthContext.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/pages/ProfilePage.tsx`

---

## Convenciones respetadas / no respetadas

Las únicas convenciones escritas en el proyecto (AGENTS.md + CLAUDE.md) son de **backend**. Para el frontend no había ninguna escrita en ninguna parte.

Del enunciado del ticket (FLOW-2) había dos restricciones con nombre:

- "Usa los componentes de shadcn/ui" → **no respetada**. Se usó Tailwind con clases directas; shadcn/ui no se instaló ni se usó.
- "No instales librería de formularios sin justificarlo" → **respetada**. No se instaló ninguna.

---

## Intervenciones necesarias: 0

El agente encontró un error de TypeScript (`noUnusedLocals` con `setError`) y lo corrigió solo antes de terminar. No fue necesario corregir, aclarar, repetir ni parar nada.

---

## Qué arreglar antes de enseñarlo al equipo

- **shadcn/ui**: el ticket lo pide explícitamente y no está. Habría que instalarlo e integrar al menos `Button`, `Input`, `Card`, `Label` en los formularios.
- **Rutas no protegidas simétricamente**: si ya estás logueado y vas a `/login` o `/register`, no redirige al perfil. Un usuario con sesión activa puede volver a ver el formulario.
- **Token en localStorage**: funcional, pero es el enfoque más expuesto a XSS. Sin política de seguridad explícita en el proyecto es aceptable, pero vale la pena documentarlo o decidirlo conscientemente.
- **No hay ningún test**: el backend tiene suite Japa; el frontend se entregó sin un solo test de los flujos críticos (submit con credenciales inválidas, redirección post-login).

---

## Notas personales

Creé el CLAUDE.md y el AGENTS.md, y linké este último en el primero. Luego conecté el MCP de Atlassian pero no me funcionó la autenticación por token. Y no me dio tiempo a más :(

Las diferencias encontradas es que sin hardness me borro un fichero y creo alguna dependencia nueva en el proyecto

Y por ultimo, veo que no ha respetado la descripcion de la tarea, "Usa los componentes de shadcn/ui" → no se respetó. Se usó Tailwind con clases directas, shadcn/ui no se instaló ni se usó.
Y es una de las cosas que propone de arreglar
