import type { RedmineIssue, StatusDefinition } from '../data/issues'
import { calculateCycleTime } from './cycleTime'
import type { ReferenceTime } from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'

export type CurrentWipIssue = StatusHistoryIssue & Pick<RedmineIssue, 'status'>

export interface CurrentWipStatus {
  statusId: number
  statusName: string
  issueCount: number
}

export function calculateCurrentWipByStatus(
  issues: readonly CurrentWipIssue[],
  statusDefinitions: readonly StatusDefinition[],
  referenceTime: ReferenceTime,
): CurrentWipStatus[] {
  const countsByStatus = new Map<number, CurrentWipStatus>()
  const definitionsById = new Map(
    statusDefinitions.map((definition) => [definition.id, definition]),
  )
  const processOrder = new Map(
    statusDefinitions.map((definition, index) => [definition.id, index]),
  )

  for (const issue of issues) {
    const cycleTime = calculateCycleTime(
      issue,
      statusDefinitions,
      referenceTime,
    )

    if (
      cycleTime === null ||
      !cycleTime.isRunning ||
      cycleTime.endedAt !== null
    ) {
      continue
    }

    const existing = countsByStatus.get(issue.status.id)
    if (existing !== undefined) {
      existing.issueCount += 1
      continue
    }

    countsByStatus.set(issue.status.id, {
      statusId: issue.status.id,
      statusName:
        definitionsById.get(issue.status.id)?.name ?? issue.status.name,
      issueCount: 1,
    })
  }

  return [...countsByStatus.values()].sort(
    (left, right) =>
      (processOrder.get(left.statusId) ?? Number.MAX_SAFE_INTEGER) -
        (processOrder.get(right.statusId) ?? Number.MAX_SAFE_INTEGER) ||
      left.statusId - right.statusId,
  )
}
