import { TaskSchema } from '#database/schema'
import User from '#models/user'
import { type TaskStatus } from '#models/task_status'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Task extends TaskSchema {
  /**
   * The generated schema types the column as a plain string; the table only
   * accepts these values.
   */
  declare status: TaskStatus

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>
}
