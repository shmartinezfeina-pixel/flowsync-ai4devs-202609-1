import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task_status'

/**
 * Shared rules for the task title. It is never truncated: anything over the
 * limit is rejected.
 */
const title = () => vine.string().trim().minLength(1).maxLength(255)

/**
 * Validator to use when creating a task. The title is the only input; any
 * other key (status, assignee) is dropped, so the task always starts pending
 * and assigned to its creator.
 */
export const createTaskValidator = vine.create({
  title: title(),
})

/**
 * Validator to use when updating a task. Every field is optional, but keys
 * sent as `null` must be rejected before reaching it (see TasksController).
 */
export const updateTaskValidator = vine.create({
  title: title().optional(),
  status: vine.enum(TASK_STATUSES).optional(),
  assigneeId: vine
    .number()
    .withoutDecimals()
    .positive()
    .exists({ table: 'users', column: 'id' })
    .optional(),
})
