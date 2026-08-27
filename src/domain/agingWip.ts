import type { RedmineIssue, StatusDefinition } from '../data/issues'
import { calculateCycleTime } from './cycleTime'
import type { ReferenceTime } from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'

const DAY_MS = 24 * 60 * 60 * 1000

export type AgingWipIssue = StatusHistoryIssue &
  Pick<RedmineIssue, 'id' | 'subject' | 'status'>

export interface AgingWipItem {
  issueId: number
  subject: string
  currentStatus: string
  startedAt: string
  ageMs: number
  ageDays: number
}

export function calculateAgingWip(
  issues: readonly AgingWipIssue[],
  statusDefinitions: readonly StatusDefinition[],
  referenceTime: ReferenceTime,
): AgingWipItem[] {
  return issues
    .flatMap((issue): AgingWipItem[] => {
      const cycleTime = calculateCycleTime(
        issue,
        statusDefinitions,
        referenceTime,
      )

      if (
        cycleTime === null ||
        !cycleTime.isRunning ||
        cycleTime.endedAt !== null ||
        cycleTime.durationMs === null ||
        !Number.isFinite(cycleTime.durationMs) ||
        cycleTime.durationMs < 0
      ) {
        return []
      }

      return [
        {
          issueId: issue.id,
          subject: issue.subject,
          currentStatus: issue.status.name,
          startedAt: cycleTime.startedAt,
          ageMs: cycleTime.durationMs,
          ageDays: cycleTime.durationMs / DAY_MS,
        },
      ]
    })
    .sort(
      (left, right) =>
        right.ageMs - left.ageMs ||
        left.issueId - right.issueId ||
        left.subject.localeCompare(right.subject),
    )
}
