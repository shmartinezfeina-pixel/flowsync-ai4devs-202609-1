/**
 * The closed set of task states. Lives apart from the `Task` model because the
 * migration imports it, and the model depends on the schema that migration
 * generates.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
