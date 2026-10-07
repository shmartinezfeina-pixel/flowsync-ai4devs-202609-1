import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task_status'

/**
 * Shared rules for the task title. It is never truncated: anything over the
 * limit is rejected.
 */
const title = () => vine.string().trim().minLength(1).maxLength(255)

/**
 * Calendar date with no time of day. Past dates are accepted on purpose, and
 * `null` (or an empty value) means "no due date".
 */
const dueDate = () =>
  vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional()

/**
 * Validator to use when creating a task. Only the title is required; any
 * other key (status, assignee, isOverdue) is dropped, so the task always starts
 * pending and assigned to its creator.
 */
export const createTaskValidator = vine.create({
  title: title(),
  dueDate: dueDate(),
})

/**
 * Validator to use when updating a task. Every field is optional. A `null`
 * title, status or assignee must be rejected before reaching it (see
 * TasksController); a `null` due date is valid and removes the date.
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
  dueDate: dueDate(),
})
