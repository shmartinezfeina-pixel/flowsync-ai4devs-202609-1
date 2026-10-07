import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * The person a task is assigned to. Exposes only what the task list needs,
 * never the email or any other account data.
 */
export default class AssigneeTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'fullName'])
  }
}
