import type { StatusDefinition } from '../data/issues'
import { calculateCycleTime } from './cycleTime'
import type { ReferenceTime } from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'

export interface CycleTimeMetrics {
  medianCompletedDurationMs: number | null
  completedCount: number
  runningCount: number
}

export function calculateCycleTimeMetrics(
  issues: readonly StatusHistoryIssue[],
  statusDefinitions: readonly StatusDefinition[],
  referenceTime?: ReferenceTime,
): CycleTimeMetrics {
  const completedDurations: number[] = []
  let completedCount = 0
  let runningCount = 0

  for (const issue of issues) {
    const cycleTime = calculateCycleTime(
      issue,
      statusDefinitions,
      referenceTime,
    )

    if (cycleTime === null) {
      continue
    }

    if (cycleTime.isRunning) {
      runningCount += 1
      continue
    }

    completedCount += 1

    if (
      cycleTime.durationMs !== null &&
      Number.isFinite(cycleTime.durationMs) &&
      cycleTime.durationMs >= 0
    ) {
      completedDurations.push(cycleTime.durationMs)
    }
  }

  return {
    medianCompletedDurationMs: calculateMedian(completedDurations),
    completedCount,
    runningCount,
  }
}

function calculateMedian(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const sortedValues = [...values].sort((left, right) => left - right)
  const middleIndex = Math.floor(sortedValues.length / 2)

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex]
  }

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
}
