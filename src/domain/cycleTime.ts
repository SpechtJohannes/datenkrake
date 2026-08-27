import type { StatusDefinition } from '../data/issues'
import type { ReferenceTime } from './statusDwellTime'
import {
  reconstructStatusHistory,
  type StatusHistoryIssue,
} from './statusHistory'

const CYCLE_START_STATUS_NAME = 'Refined'
const CYCLE_END_STATUS_NAME = 'Done'

export interface CycleTimeResult {
  startedAt: string
  endedAt: string | null
  durationMs: number | null
  isRunning: boolean
}

export function calculateCycleTime(
  issue: StatusHistoryIssue,
  statusDefinitions: readonly StatusDefinition[],
  referenceTime?: ReferenceTime,
): CycleTimeResult | null {
  const startStatusId = getUniqueStatusId(
    statusDefinitions,
    CYCLE_START_STATUS_NAME,
  )
  const endStatusId = getUniqueStatusId(
    statusDefinitions,
    CYCLE_END_STATUS_NAME,
  )

  if (startStatusId === null || endStatusId === null) {
    return null
  }

  const history = reconstructStatusHistory(issue, statusDefinitions)
  const startPhaseIndex = history.findIndex(
    (phase) => phase.statusId === startStatusId,
  )

  if (startPhaseIndex === -1) {
    return null
  }

  const startedAt = history[startPhaseIndex].startedAt
  const endPhase = history
    .slice(startPhaseIndex + 1)
    .find((phase) => phase.statusId === endStatusId)

  if (endPhase !== undefined) {
    return {
      startedAt,
      endedAt: endPhase.startedAt,
      durationMs: calculateDuration(startedAt, endPhase.startedAt),
      isRunning: false,
    }
  }

  return {
    startedAt,
    endedAt: null,
    durationMs:
      referenceTime === undefined
        ? null
        : calculateDuration(startedAt, referenceTime),
    isRunning: true,
  }
}

function getUniqueStatusId(
  statusDefinitions: readonly StatusDefinition[],
  statusName: string,
): number | null {
  const matchingDefinitions = statusDefinitions.filter(
    (definition) => definition.name === statusName,
  )

  return matchingDefinitions.length === 1 ? matchingDefinitions[0].id : null
}

function calculateDuration(
  startedAt: string,
  endedAt: ReferenceTime,
): number | null {
  const startedAtMs = Date.parse(startedAt)
  const endedAtMs = toTimestamp(endedAt)

  if (!Number.isFinite(startedAtMs) || endedAtMs === null) {
    return null
  }

  const durationMs = endedAtMs - startedAtMs
  return durationMs >= 0 ? durationMs : null
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
