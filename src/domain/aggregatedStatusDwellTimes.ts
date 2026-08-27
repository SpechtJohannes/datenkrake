import type { StatusDefinition } from '../data/issues'
import {
  calculateStatusDwellTimes,
  type ReferenceTime,
} from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'

export interface AggregatedStatusDwellTime {
  statusId: number
  statusName: string | null
  dwellTimeCount: number
  medianDurationMs: number
  averageDurationMs: number
}

interface StatusDurations {
  statusId: number
  statusName: string | null
  durationsMs: number[]
}

export function calculateAggregatedStatusDwellTimes(
  issues: readonly StatusHistoryIssue[],
  statusDefinitions: readonly StatusDefinition[],
  referenceTime: ReferenceTime,
): AggregatedStatusDwellTime[] {
  const durationsByStatus = new Map<number, StatusDurations>()
  const definitionsById = new Map(
    statusDefinitions.map((definition) => [definition.id, definition]),
  )
  const processOrder = new Map(
    statusDefinitions.map((definition, index) => [definition.id, index]),
  )

  for (const issue of issues) {
    const dwellTimes = calculateStatusDwellTimes(
      issue,
      referenceTime,
      statusDefinitions,
    )

    for (const dwellTime of dwellTimes) {
      const validDurations = dwellTime.visitDurationsMs.filter(
        (duration) => Number.isFinite(duration) && duration >= 0,
      )
      if (validDurations.length === 0) continue

      const existing = durationsByStatus.get(dwellTime.statusId)
      if (existing !== undefined) {
        existing.durationsMs.push(...validDurations)
        if (existing.statusName === null && dwellTime.statusName !== null) {
          existing.statusName = dwellTime.statusName
        }
        continue
      }

      durationsByStatus.set(dwellTime.statusId, {
        statusId: dwellTime.statusId,
        statusName:
          definitionsById.get(dwellTime.statusId)?.name ?? dwellTime.statusName,
        durationsMs: [...validDurations],
      })
    }
  }

  return [...durationsByStatus.values()]
    .sort(
      (left, right) =>
        (processOrder.get(left.statusId) ?? Number.MAX_SAFE_INTEGER) -
          (processOrder.get(right.statusId) ?? Number.MAX_SAFE_INTEGER) ||
        left.statusId - right.statusId,
    )
    .map(({ statusId, statusName, durationsMs }) => ({
      statusId,
      statusName,
      dwellTimeCount: durationsMs.length,
      medianDurationMs: calculateMedianMs(durationsMs),
      averageDurationMs:
        durationsMs.reduce((sum, duration) => sum + duration, 0) /
        durationsMs.length,
    }))
}

export function calculateMedianMs(values: readonly number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}
