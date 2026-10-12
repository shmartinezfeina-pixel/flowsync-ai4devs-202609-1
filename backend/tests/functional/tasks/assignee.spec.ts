import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que una tarea enseña de quien la lleva. Cubre los scenarios del requisito
 * «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable se identifica por nombre e
 * iniciales, no lleva ningún dato de acceso de su cuenta —ni en la tarea
 * suelta ni dentro de la lista—, y una cuenta sin nombre sigue teniendo
 * iniciales.
 *
 * La tarea suelta se pide con `today` porque ese endpoint exige el día de
 * referencia; aquí no se mira el vencimiento, solo el `assignee`.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const HOY = '2026-10-12'

  async function tareaDe(fullName: string | null, email = 'ada@example.com') {
    const user = await User.create({ fullName, email, password: 'secreto123' })
    const task = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: user.id,
    })

    return { user, task }
  }

  test('el responsable de una tarea llega con su nombre y sus iniciales', async ({
    client,
    assert,
  }) => {
    const { user, task } = await tareaDe('Ada Lovelace')

    const response = await client.get(`/api/v1/tasks/${task.id}`).qs({ today: HOY }).loginAs(user)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.equal(assignee.fullName, 'Ada Lovelace')
    assert.equal(assignee.initials, 'AL')
  })

  test('una tarea suelta no expone el email ni datos de acceso de su responsable', async ({
    client,
    assert,
  }) => {
    const { user, task } = await tareaDe('Ada Lovelace')

    const response = await client.get(`/api/v1/tasks/${task.id}`).qs({ today: HOY }).loginAs(user)

    response.assertStatus(200)

    const assignee = response.body().data.assignee
    assert.notProperty(assignee, 'email')
    assert.notProperty(assignee, 'password')
    assert.notInclude(JSON.stringify(assignee), 'ada@example.com')
    assert.notInclude(JSON.stringify(assignee), 'secreto123')
  })

  test('dentro de la lista la tarea no expone el email ni datos de acceso de su responsable', async ({
    client,
    assert,
  }) => {
    const { user, task } = await tareaDe('Ada Lovelace')

    const response = await client.get('/api/v1/tasks').loginAs(user)

    response.assertStatus(200)

    const enLista = response.body().data.find((t: { id: number }) => t.id === task.id)
    assert.exists(enLista)
    assert.notProperty(enLista.assignee, 'email')
    assert.notProperty(enLista.assignee, 'password')
    assert.notInclude(JSON.stringify(enLista.assignee), 'ada@example.com')
    assert.notInclude(JSON.stringify(enLista.assignee), 'secreto123')
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const { user, task } = await tareaDe(null, 'sin-nombre@example.com')

    const response = await client.get(`/api/v1/tasks/${task.id}`).qs({ today: HOY }).loginAs(user)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.isNull(assignee.fullName)
    assert.isString(assignee.initials)
    assert.isNotEmpty(assignee.initials)
    assert.notProperty(assignee, 'email')
  })
})
