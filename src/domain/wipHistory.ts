import type { StatusDefinition } from '../data/issues'
import { calculateCycleTime, type CycleTimeResult } from './cycleTime'
import type { ReferenceTime } from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'

const DAY_MS = 24 * 60 * 60 * 1000

export interface WipHistoryPoint {
  date: string
  timestampMs: number
  wipCount: number
}

interface WipInterval {
  startedAtMs: number
  endedAtMs: number
  isRunning: boolean
}

export function calculateWipHistory(
  issues: readonly StatusHistoryIssue[],
  statusDefinitions: readonly StatusDefinition[],
  referenceTime: ReferenceTime,
): WipHistoryPoint[] {
  const referenceTimeMs = toTimestamp(referenceTime)
  const intervals = issues.flatMap((issue): WipInterval[] => {
    const cycleTime = calculateCycleTime(
      issue,
      statusDefinitions,
      referenceTime,
    )

    if (cycleTime === null) {
      return []
    }

    const startedAtMs = Date.parse(cycleTime.startedAt)
    const endedAtMs = getIntervalEndTimestamp(cycleTime, referenceTimeMs)

    if (
      !Number.isFinite(startedAtMs) ||
      endedAtMs === null ||
      !Number.isFinite(endedAtMs) ||
      endedAtMs < startedAtMs
    ) {
      return []
    }

    return [{ startedAtMs, endedAtMs, isRunning: cycleTime.isRunning }]
  })

  if (intervals.length === 0) {
    return []
  }

  const firstDayMs = startOfUtcDay(
    Math.min(...intervals.map((interval) => interval.startedAtMs)),
  )
  const runningIntervals = intervals.filter((interval) => interval.isRunning)
  const lastRelevantMs =
    runningIntervals.length > 0 && referenceTimeMs !== null
      ? referenceTimeMs
      : Math.max(...intervals.map((interval) => interval.endedAtMs))
  const lastDayMs = startOfUtcDay(lastRelevantMs)

  const points: WipHistoryPoint[] = []
  for (
    let timestampMs = firstDayMs;
    timestampMs <= lastDayMs;
    timestampMs += DAY_MS
  ) {
    const wipCount = intervals.filter(
      (interval) =>
        interval.startedAtMs <= timestampMs &&
        (interval.isRunning
          ? timestampMs <= interval.endedAtMs
          : timestampMs < interval.endedAtMs),
    ).length

    points.push({
      date: new Date(timestampMs).toISOString().slice(0, 10),
      timestampMs,
      wipCount,
    })
  }

  return points
}

function startOfUtcDay(timestampMs: number): number {
  const date = new Date(timestampMs)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function getIntervalEndTimestamp(
  cycleTime: CycleTimeResult,
  referenceTimeMs: number | null,
): number | null {
  if (cycleTime.isRunning) {
    return referenceTimeMs
  }

  if (cycleTime.endedAt === null) {
    return null
  }

  return Date.parse(cycleTime.endedAt)
}

function toTimestamp(referenceTime: ReferenceTime): number | null {
  let timestamp: number
  if (typeof referenceTime === 'string') {
    timestamp = Date.parse(referenceTime)
  } else if (referenceTime instanceof Date) {
    timestamp = referenceTime.getTime()
  } else {
    timestamp = referenceTime
  }

  return Number.isFinite(timestamp) ? timestamp : null
}
