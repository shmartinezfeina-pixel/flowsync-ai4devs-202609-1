import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

const HEADER = 'X-Client-Date'
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * The calendar day the overdue verdict is computed against: the viewer's own
 * day, sent by the client as `X-Client-Date: YYYY-MM-DD`. Without the header
 * the current UTC day is used, so the verdict is still deterministic.
 *
 * Resolve it before touching the database: an invalid header must leave
 * nothing modified.
 */
export function referenceDay(request: HttpContext['request']): string {
  const value = request.header(HEADER)
  if (value === undefined) return DateTime.utc().toISODate()

  if (!ISO_DAY.test(value) || !DateTime.fromISO(value, { zone: 'utc' }).isValid) {
    throw new errors.E_VALIDATION_ERROR([
      {
        message: `The ${HEADER} header must be a valid date in YYYY-MM-DD format`,
        rule: 'date',
        field: HEADER,
      },
    ])
  }

  return value
}
