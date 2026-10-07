import Task from '#models/task'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { referenceDay } from '#services/reference_day'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

/**
 * Fields that cannot be emptied on update. `dueDate` is deliberately absent:
 * sending it empty removes the date.
 */
const NON_NULLABLE_FIELDS = ['title', 'status', 'assigneeId'] as const

export default class TasksController {
  /**
   * The whole shared list, the same for everyone. Deliberately unordered:
   * no ordering rule has been decided yet.
   */
  async index({ request, serialize }: HttpContext) {
    const today = referenceDay(request)
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks, today))
  }

  async show({ params, request, serialize }: HttpContext) {
    const today = referenceDay(request)
    const task = await Task.query().where('id', params.id).preload('assignee').firstOrFail()

    return serialize(TaskTransformer.transform(task, today))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const today = referenceDay(request)
    const { title, dueDate } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
      dueDate: dueDate ?? null,
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task, today))
  }

  async update({ params, request, serialize }: HttpContext) {
    const today = referenceDay(request)

    /**
     * The bodyparser turns blank strings into `null`, and `optional()` treats
     * `null` as absent. A field the client did send must be rejected instead
     * of silently ignored.
     */
    const body = request.body()
    const sentEmpty = NON_NULLABLE_FIELDS.filter(
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

    // `merge` skips undefined keys and assigns `dueDate: null`, which clears it.
    task.merge(payload)
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }
}
