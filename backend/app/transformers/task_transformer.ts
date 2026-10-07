import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import AssigneeTransformer from '#transformers/assignee_transformer'

export default class TaskTransformer extends BaseTransformer<Task> {
  /**
   * @param today The viewer's calendar day (`YYYY-MM-DD`), see `referenceDay`.
   */
  constructor(
    resource: Task,
    protected today: string
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.today),
      assignee: AssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
