import Task from '#models/task'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

const UPDATABLE_FIELDS = ['title', 'status', 'assigneeId'] as const

export default class TasksController {
  /**
   * The whole shared list, the same for everyone. Deliberately unordered:
   * no ordering rule has been decided yet.
   */
  async index({ serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }

  async update({ params, request, serialize }: HttpContext) {
    /**
     * The bodyparser turns blank strings into `null`, and `optional()` treats
     * `null` as absent. A field the client did send must be rejected instead
     * of silently ignored.
     */
    const body = request.body()
    const sentEmpty = UPDATABLE_FIELDS.filter(
      (field) => Object.hasOwn(body, field) && body[field] === null
    )
    if (sentEmpty.length) {
      throw new errors.E_VALIDATION_ERROR(
        sentEmpty.map((field) => ({
          message: `The ${field} field must be defined`,
          rule: 'required',
          field,
        }))
      )
    }

    const payload = await request.validateUsing(updateTaskValidator)
    const task = await Task.findOrFail(params.id)

    task.merge(payload)
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
