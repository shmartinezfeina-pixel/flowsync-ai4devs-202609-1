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

    // Quien mira es otra cuenta: así el `assignee` no se puede confundir con
    // la cuenta del token.
    const viewer = await User.create({
      fullName: 'Alan Turing',
      email: 'alan@example.com',
      password: 'secreto123',
    })

    return { user, task, viewer }
  }

  test('el responsable de una tarea llega con su nombre y sus iniciales', async ({
    client,
    assert,
  }) => {
    const { user, task, viewer } = await tareaDe('Ada Lovelace')

    const response = await client.get(`/api/v1/tasks/${task.id}`).qs({ today: HOY }).loginAs(viewer)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.equal(assignee.id, user.id)
    assert.equal(assignee.fullName, 'Ada Lovelace')
    assert.equal(assignee.initials, 'AL')
  })

  test('una tarea suelta no expone el email ni datos de acceso de su responsable', async ({
    client,
    assert,
  }) => {
    const { task, viewer } = await tareaDe('Ada Lovelace')

    const response = await client.get(`/api/v1/tasks/${task.id}`).qs({ today: HOY }).loginAs(viewer)

    response.assertStatus(200)

    const assignee = response.body().data.assignee
    assert.notProperty(assignee, 'email')
    assert.notProperty(assignee, 'password')
    // Ningún otro dato de la cuenta: solo lo que identifica al responsable.
    assert.sameMembers(Object.keys(assignee), ['id', 'fullName', 'initials'])
    assert.notInclude(JSON.stringify(assignee), 'ada@example.com')
    assert.notInclude(JSON.stringify(assignee), 'secreto123')
  })

  test('dentro de la lista la tarea no expone el email ni datos de acceso de su responsable', async ({
    client,
    assert,
  }) => {
    const { task, viewer } = await tareaDe('Ada Lovelace')

    const response = await client.get('/api/v1/tasks').loginAs(viewer)

    response.assertStatus(200)

    const enLista = (response.body().data as Array<{ id: number; assignee: object }>).find(
      (t) => t.id === task.id
    )
    if (!enLista) return assert.fail('la tarea no sale en la lista')
    assert.notProperty(enLista.assignee, 'email')
    assert.notProperty(enLista.assignee, 'password')
    // Ningún otro dato de la cuenta: solo lo que identifica al responsable.
    assert.sameMembers(Object.keys(enLista.assignee), ['id', 'fullName', 'initials'])
    assert.notInclude(JSON.stringify(enLista.assignee), 'ada@example.com')
    assert.notInclude(JSON.stringify(enLista.assignee), 'secreto123')
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const { task, viewer } = await tareaDe(null, 'sin-nombre@example.com')

    const response = await client.get(`/api/v1/tasks/${task.id}`).qs({ today: HOY }).loginAs(viewer)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.isNull(assignee.fullName)
    // Las de auth: sin nombre salen del email (`sin-nombre@example.com` → SE).
    assert.equal(assignee.initials, 'SE')
    assert.notProperty(assignee, 'email')
  })
})
