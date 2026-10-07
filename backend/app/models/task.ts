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

  /**
   * The only place that decides whether a task is overdue. `today` is the
   * viewer's calendar day (`YYYY-MM-DD`), so the verdict is computed on every
   * read and never stored. A due date equal to today is not overdue yet.
   */
  isOverdueOn(today: string): boolean {
    // Right after `create` without a date, Lucid leaves `dueDate` undefined.
    if (!this.dueDate || this.status === 'done') return false
    return this.dueDate.toISODate()! < today
  }
}
