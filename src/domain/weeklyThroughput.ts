import type { StatusDefinition } from '../data/issues'
import { calculateCycleTime } from './cycleTime'
import type { StatusHistoryIssue } from './statusHistory'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface WeeklyThroughput {
  isoWeekYear: number
  isoWeek: number
  completedCount: number
  weekStart: string
  weekEnd: string
}

export function calculateWeeklyThroughput(
  issues: readonly StatusHistoryIssue[],
  statusDefinitions: readonly StatusDefinition[],
): WeeklyThroughput[] {
  const completedCountsByWeek = new Map<number, number>()

  for (const issue of issues) {
    const cycleTime = calculateCycleTime(issue, statusDefinitions)

    if (
      cycleTime === null ||
      cycleTime.isRunning ||
      cycleTime.endedAt === null
    ) {
      continue
    }

    const completedAtMs = Date.parse(cycleTime.endedAt)

    if (!Number.isFinite(completedAtMs)) {
      continue
    }

    const weekStartMs = getIsoWeekStartMs(completedAtMs)
    completedCountsByWeek.set(
      weekStartMs,
      (completedCountsByWeek.get(weekStartMs) ?? 0) + 1,
    )
  }

  const occupiedWeekStarts = [...completedCountsByWeek.keys()].sort(
    (left, right) => left - right,
  )

  if (occupiedWeekStarts.length === 0) {
    return []
  }

  const firstWeekStart = occupiedWeekStarts[0]
  const lastWeekStart = occupiedWeekStarts.at(-1) ?? firstWeekStart
  const throughput: WeeklyThroughput[] = []

  for (
    let weekStartMs = firstWeekStart;
    weekStartMs <= lastWeekStart;
    weekStartMs += WEEK_MS
  ) {
    const { isoWeekYear, isoWeek } = getIsoWeek(weekStartMs)
    throughput.push({
      isoWeekYear,
      isoWeek,
      completedCount: completedCountsByWeek.get(weekStartMs) ?? 0,
      weekStart: new Date(weekStartMs).toISOString(),
      weekEnd: new Date(weekStartMs + WEEK_MS - 1).toISOString(),
    })
  }

  return throughput
}

function getIsoWeekStartMs(timestamp: number): number {
  const date = new Date(timestamp)
  const utcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  const dayOfWeek = (new Date(utcMidnight).getUTCDay() + 6) % 7
  return utcMidnight - dayOfWeek * 24 * 60 * 60 * 1000
}

function getIsoWeek(timestamp: number): {
  isoWeekYear: number
  isoWeek: number
} {
  const thursday = new Date(timestamp)
  const dayOfWeek = (thursday.getUTCDay() + 6) % 7
  thursday.setUTCDate(thursday.getUTCDate() - dayOfWeek + 3)

  const isoWeekYear = thursday.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoWeekYear, 0, 4))
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3)

  return {
    isoWeekYear,
    isoWeek:
      1 + Math.round((thursday.getTime() - firstThursday.getTime()) / WEEK_MS),
  }
}
