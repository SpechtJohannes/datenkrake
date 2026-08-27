import type { StatusDefinition } from '../data/issues'
import { calculateCycleTime } from './cycleTime'
import type { ReferenceTime } from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'

export interface CycleTimeMetrics {
  medianCompletedDurationMs: number | null
  p85CompletedDurationMs: number | null
  p95CompletedDurationMs: number | null
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
    medianCompletedDurationMs: calculatePercentile(completedDurations, 0.5),
    p85CompletedDurationMs: calculatePercentile(completedDurations, 0.85),
    p95CompletedDurationMs: calculatePercentile(completedDurations, 0.95),
    completedCount,
    runningCount,
  }
}

export function calculatePercentile(
  values: readonly number[],
  percentile: number,
): number | null {
  if (values.length === 0 || percentile < 0 || percentile > 1) {
    return null
  }

  const sortedValues = [...values].sort((left, right) => left - right)
  const rank = (sortedValues.length - 1) * percentile
  const lowerIndex = Math.floor(rank)
  const upperIndex = Math.ceil(rank)
  const interpolationWeight = rank - lowerIndex

  return (
    sortedValues[lowerIndex] +
    (sortedValues[upperIndex] - sortedValues[lowerIndex]) * interpolationWeight
  )
}
