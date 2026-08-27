import type { StatusDefinition } from '../data/issues'
import { calculateCycleTime } from './cycleTime'
import type { ReferenceTime } from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_BUCKET_COUNT = 8

export interface CycleTimeHistogramBucket {
  lowerBoundDays: number
  upperBoundDays: number
  count: number
}

export interface CycleTimeHistogram {
  buckets: CycleTimeHistogramBucket[]
  minDurationMs: number | null
  maxDurationMs: number | null
  validCycleTimeCount: number
}

export function calculateCycleTimeHistogram(
  issues: readonly StatusHistoryIssue[],
  statusDefinitions: readonly StatusDefinition[],
  referenceTime?: ReferenceTime,
): CycleTimeHistogram {
  const durations = issues.flatMap((issue) => {
    const cycleTime = calculateCycleTime(
      issue,
      statusDefinitions,
      referenceTime,
    )

    return cycleTime !== null &&
      !cycleTime.isRunning &&
      cycleTime.durationMs !== null &&
      Number.isFinite(cycleTime.durationMs) &&
      cycleTime.durationMs >= 0
      ? [cycleTime.durationMs]
      : []
  })

  if (durations.length === 0) {
    return {
      buckets: [],
      minDurationMs: null,
      maxDurationMs: null,
      validCycleTimeCount: 0,
    }
  }

  const minDurationMs = Math.min(...durations)
  const maxDurationMs = Math.max(...durations)

  if (minDurationMs === maxDurationMs) {
    return {
      buckets: [
        {
          lowerBoundDays: minDurationMs / DAY_MS,
          upperBoundDays: maxDurationMs / DAY_MS,
          count: durations.length,
        },
      ],
      minDurationMs,
      maxDurationMs,
      validCycleTimeCount: durations.length,
    }
  }

  const bucketCount = Math.min(
    MAX_BUCKET_COUNT,
    Math.ceil(Math.log2(durations.length) + 1),
  )
  const bucketWidthMs = (maxDurationMs - minDurationMs) / bucketCount
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    lowerBoundDays: (minDurationMs + index * bucketWidthMs) / DAY_MS,
    upperBoundDays: (minDurationMs + (index + 1) * bucketWidthMs) / DAY_MS,
    count: 0,
  }))

  for (const duration of durations) {
    const bucketIndex =
      duration === maxDurationMs
        ? bucketCount - 1
        : Math.floor((duration - minDurationMs) / bucketWidthMs)
    buckets[bucketIndex].count += 1
  }

  return {
    buckets,
    minDurationMs,
    maxDurationMs,
    validCycleTimeCount: durations.length,
  }
}
