import {
  reconstructStatusHistory,
  type StatusHistoryIssue,
  type StatusPhase,
} from './statusHistory'
import type { StatusDefinition } from '../data/issues'

export type ReferenceTime = string | number | Date

export interface StatusDwellTime {
  statusId: number
  statusName: string | null
  completedDurationMs: number
  ongoingDurationMs: number | null
  totalDurationMs: number
  visitCount: number
  isCurrent: boolean
  visitDurationsMs: number[]
}

export function calculateStatusDwellTimes(
  issue: StatusHistoryIssue,
  referenceTime?: ReferenceTime,
  statusDefinitions: readonly StatusDefinition[] = [],
): StatusDwellTime[] {
  const phases = reconstructStatusHistory(issue, statusDefinitions)
  const currentPhase = phases.at(-1)
  const dwellTimes = new Map<number, StatusDwellTime>()

  for (const phase of phases) {
    const dwellTime = getOrCreateDwellTime(dwellTimes, phase)
    dwellTime.visitCount += 1

    if (phase.statusName !== null && dwellTime.statusName === null) {
      dwellTime.statusName = phase.statusName
    }

    if (phase.endedAt !== null) {
      dwellTime.completedDurationMs += getNonNegativeDuration(phase.durationMs)
      if (isValidDuration(phase.durationMs)) {
        dwellTime.visitDurationsMs.push(phase.durationMs)
      }
    }
  }

  if (currentPhase !== undefined) {
    const currentDwellTime = dwellTimes.get(currentPhase.statusId)

    if (currentDwellTime !== undefined) {
      currentDwellTime.isCurrent = true

      if (currentPhase.endedAt === null) {
        currentDwellTime.ongoingDurationMs = calculateOngoingDuration(
          currentPhase.startedAt,
          referenceTime,
        )
        if (isValidDuration(currentDwellTime.ongoingDurationMs)) {
          currentDwellTime.visitDurationsMs.push(
            currentDwellTime.ongoingDurationMs,
          )
        }
      }
    }
  }

  return Array.from(dwellTimes.values(), (dwellTime) => ({
    ...dwellTime,
    totalDurationMs:
      dwellTime.completedDurationMs + (dwellTime.ongoingDurationMs ?? 0),
  }))
}

function getOrCreateDwellTime(
  dwellTimes: Map<number, StatusDwellTime>,
  phase: StatusPhase,
): StatusDwellTime {
  const existingDwellTime = dwellTimes.get(phase.statusId)

  if (existingDwellTime !== undefined) {
    return existingDwellTime
  }

  const dwellTime: StatusDwellTime = {
    statusId: phase.statusId,
    statusName: phase.statusName,
    completedDurationMs: 0,
    ongoingDurationMs: null,
    totalDurationMs: 0,
    visitCount: 0,
    isCurrent: false,
    visitDurationsMs: [],
  }
  dwellTimes.set(phase.statusId, dwellTime)
  return dwellTime
}

function getNonNegativeDuration(durationMs: number | null): number {
  return durationMs !== null && Number.isFinite(durationMs) && durationMs >= 0
    ? durationMs
    : 0
}

function isValidDuration(durationMs: number | null): durationMs is number {
  return durationMs !== null && Number.isFinite(durationMs) && durationMs >= 0
}

function calculateOngoingDuration(
  startedAt: string,
  referenceTime: ReferenceTime | undefined,
): number | null {
  if (referenceTime === undefined) {
    return null
  }

  const startedAtMs = Date.parse(startedAt)
  const referenceTimeMs = toTimestamp(referenceTime)

  if (!Number.isFinite(startedAtMs) || referenceTimeMs === null) {
    return null
  }

  return Math.max(0, referenceTimeMs - startedAtMs)
}

function toTimestamp(referenceTime: ReferenceTime): number | null {
  const timestamp =
    typeof referenceTime === 'string'
      ? Date.parse(referenceTime)
      : referenceTime instanceof Date
        ? referenceTime.getTime()
        : referenceTime

  return Number.isFinite(timestamp) ? timestamp : null
}

export function formatDurationMs(durationMs: number): string {
  const safeDurationMs = getNonNegativeDuration(durationMs)
  const totalMinutes = Math.floor(safeDurationMs / (60 * 1000))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []

  if (days > 0) {
    parts.push(`${days}d`)
  }

  if (hours > 0) {
    parts.push(`${hours}h`)
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`)
  }

  return parts.join(' ')
}
