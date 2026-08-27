import type { RedmineIssue, StatusDefinition } from '../data/issues'
import { calculateCycleTime } from './cycleTime'
import type { StatusHistoryIssue } from './statusHistory'

const DAY_MS = 24 * 60 * 60 * 1000

export type CycleTimeTrendIssue = StatusHistoryIssue &
  Pick<RedmineIssue, 'id' | 'subject'>

export interface CycleTimeTrendPoint {
  issueId: number
  subject: string
  completedAt: string
  completedAtMs: number
  durationMs: number
  durationDays: number
}

export function calculateCycleTimeTrend(
  issues: readonly CycleTimeTrendIssue[],
  statusDefinitions: readonly StatusDefinition[],
): CycleTimeTrendPoint[] {
  return issues
    .flatMap((issue) => {
      const cycleTime = calculateCycleTime(issue, statusDefinitions)

      if (
        cycleTime === null ||
        cycleTime.isRunning ||
        cycleTime.endedAt === null ||
        cycleTime.durationMs === null ||
        !Number.isFinite(cycleTime.durationMs) ||
        cycleTime.durationMs < 0
      ) {
        return []
      }

      const completedAtMs = Date.parse(cycleTime.endedAt)

      if (!Number.isFinite(completedAtMs)) {
        return []
      }

      return [
        {
          issueId: issue.id,
          subject: issue.subject,
          completedAt: cycleTime.endedAt,
          completedAtMs,
          durationMs: cycleTime.durationMs,
          durationDays: cycleTime.durationMs / DAY_MS,
        },
      ]
    })
    .sort(
      (left, right) =>
        left.completedAtMs - right.completedAtMs ||
        left.issueId - right.issueId ||
        left.subject.localeCompare(right.subject),
    )
}
