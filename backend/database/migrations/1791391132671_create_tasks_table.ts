import { BaseSchema } from '@adonisjs/lucid/schema'
import { TASK_STATUSES } from '#models/task_status'

export default class extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('title', 255).notNullable()
      table
        .enum('status', [...TASK_STATUSES])
        .notNullable()
        .defaultTo('pending')
      table
        .integer('assignee_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
