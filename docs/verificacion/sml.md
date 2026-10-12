# Matriz de trazabilidad — «Lo que cada tarea muestra de su responsable»

Requisito: `openspec/specs/tasks/spec.md`, «Lo que cada tarea muestra de su responsable».
Suite analizada: `backend/tests/` tal y como estaba al empezar (solo `functional/auth/`).
Revisión de cobertura contrastada con el subagente `adversarial-reviewer-sml`.

**Escenarios del requisito: 4** (3 en la spec; «La tarea no filtra datos de cuenta» junta dos situaciones —tarea suelta y dentro de la lista— y se desdobla en dos filas).
**Escenarios cubiertos: 0 de 4.**

| Escenario | Test que lo cubre | Estado | Qué faltó (si «No lo sé») |
|---|---|---|---|
| Al obtener una tarea de "Ada Lovelace", su `assignee` trae ese nombre y sus iniciales | | No cubierto | |
| Al obtener una tarea suelta, su `assignee` no trae email ni datos de acceso | | No cubierto | |
| Al obtener la lista, el `assignee` de cada tarea no trae email ni datos de acceso | | No cubierto | |
| Si el responsable se registró sin nombre, su nombre llega nulo y sus iniciales siguen llegando | | No cubierto | |

Lo que se le parece y no vale como cobertura:

- `registrarse devuelve la cuenta y un token que ya sirve` (`auth/signup.spec.ts`) comprueba `initials === 'AL'` del usuario recién registrado, no del `assignee` de una tarea.
- `sin nombre, las iniciales salen del email` (`auth/initials.spec.ts`) comprueba las iniciales en la respuesta del login, no en una tarea, y no mira que `fullName` llegue nulo.
- `el perfil devuelve la cuenta del token presentado` (`auth/session.spec.ts`) comprueba que el perfil **sí** trae `email`: lo contrario, y en otro endpoint.

## Tests añadidos

Fichero: `backend/tests/functional/tasks/assignee.spec.ts` (grupo `Tasks | responsable`), uno por fila no cubierta.
Ejecutados con `node ace test functional --files=tasks/assignee`: **3 pasan, 1 falla**.

| Escenario | Test | Resultado |
|---|---|---|
| Responsable identificable | `el responsable de una tarea llega con su nombre y sus iniciales` | Pasa |
| No filtra datos — tarea suelta | `una tarea suelta no expone el email ni datos de acceso de su responsable` | Pasa |
| No filtra datos — dentro de la lista | `dentro de la lista la tarea no expone el email ni datos de acceso de su responsable` | **Falla** |
| Responsable sin nombre | `un responsable sin nombre llega con el nombre nulo y con iniciales` | Pasa |

### El fallo

```
AssertionError: expected { id: 14, …(5) } to not have nested property 'email'
  at tests/functional/tasks/assignee.spec.ts:77
```

`GET /api/v1/tasks` serializa con `TaskTransformer` (`app/transformers/task_transformer.ts:9`), que usa `UserTransformer` para el `assignee`, y este expone `email`, `createdAt` y `updatedAt` (`app/transformers/user_transformer.ts:6-13`). La tarea suelta usa `TaskAssigneeTransformer` (solo `id`, `fullName`, `initials`), cuyo propio comentario advierte de no reutilizar `UserTransformer`. **El código no se ha tocado**: el fallo se deja visible a propósito.

### Hallazgos del revisor fuera de las filas

- `POST /api/v1/tasks` y `PATCH /api/v1/tasks/:id/status` también usan `TaskTransformer`, así que su `assignee` también trae el email. El scenario dice «se obtiene cualquier tarea, suelta o dentro de la lista»; si crear o cambiar el estado cuenta como «obtener» es interpretable, y por eso no se ha abierto fila para ellos.
- Las iniciales de una cuenta sin nombre salen del email (`app/models/user.ts:12`: `ada@example.com` da `AE`). Es lo que pide la spec de `auth` y el scenario solo exige que lleguen iniciales, así que el test pasa, pero esas iniciales dejan ver parte del email.
