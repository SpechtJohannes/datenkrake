import type {
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
} from '../data/issues'

type StatusHistoryJournal = Pick<RedmineJournal, 'id' | 'created_on'> & {
  details: readonly Partial<RedmineJournalDetail>[]
}

export type StatusHistoryIssue = Pick<
  RedmineIssue,
  'status' | 'created_on' | 'closed_on'
> & {
  journals: readonly StatusHistoryJournal[]
}

export interface StatusPhase {
  statusId: number
  statusName: string | null
  startedAt: string
  endedAt: string | null
  durationMs: number | null
}

interface StatusChange {
  oldStatusId: number
  newStatusId: number
  changedAt: string
  changedAtMs: number
  journalId: number
  journalIndex: number
  detailIndex: number
}

function parseStatusId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return null
  }

  const statusId = Number(value)
  return Number.isSafeInteger(statusId) && statusId > 0 ? statusId : null
}

function getStatusChanges(issue: StatusHistoryIssue): StatusChange[] {
  const issueCreatedAtMs = Date.parse(issue.created_on)

  return issue.journals
    .flatMap((journal, journalIndex) => {
      const changedAtMs = Date.parse(journal.created_on)

      if (
        !Number.isFinite(changedAtMs) ||
        (Number.isFinite(issueCreatedAtMs) && changedAtMs < issueCreatedAtMs)
      ) {
        return []
      }

      return journal.details.flatMap((detail, detailIndex) => {
        if (detail.property !== 'attr' || detail.name !== 'status_id') {
          return []
        }

        const oldStatusId = parseStatusId(detail.old_value)
        const newStatusId = parseStatusId(detail.new_value)

        if (
          oldStatusId === null ||
          newStatusId === null ||
          oldStatusId === newStatusId
        ) {
          return []
        }

        return [
          {
            oldStatusId,
            newStatusId,
            changedAt: journal.created_on,
            changedAtMs,
            journalId: journal.id,
            journalIndex,
            detailIndex,
          },
        ]
      })
    })
    .sort(
      (left, right) =>
        left.changedAtMs - right.changedAtMs ||
        left.journalId - right.journalId ||
        left.journalIndex - right.journalIndex ||
        left.detailIndex - right.detailIndex,
    )
}

function getStatusName(
  statusId: number,
  issue: StatusHistoryIssue,
): string | null {
  return statusId === issue.status.id ? issue.status.name : null
}

function getDurationMs(startedAt: string, endedAt: string): number | null {
  const startedAtMs = Date.parse(startedAt)
  const endedAtMs = Date.parse(endedAt)

  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) {
    return null
  }

  const durationMs = endedAtMs - startedAtMs
  return durationMs >= 0 ? durationMs : null
}

function createCompletedPhase(
  statusId: number,
  startedAt: string,
  endedAt: string,
  issue: StatusHistoryIssue,
): StatusPhase {
  return {
    statusId,
    statusName: getStatusName(statusId, issue),
    startedAt,
    endedAt,
    durationMs: getDurationMs(startedAt, endedAt),
  }
}

export function reconstructStatusHistory(
  issue: StatusHistoryIssue,
): StatusPhase[] {
  const statusChanges = getConsistentStatusChanges(
    issue,
    getStatusChanges(issue),
  )

  if (statusChanges.length === 0) {
    return [createCurrentPhase(issue.status.id, issue.created_on, issue)]
  }

  const phases: StatusPhase[] = []
  let currentStatusId = statusChanges[0].oldStatusId
  let phaseStartedAt = issue.created_on

  for (const change of statusChanges) {
    if (change.oldStatusId !== currentStatusId) {
      continue
    }

    phases.push(
      createCompletedPhase(
        currentStatusId,
        phaseStartedAt,
        change.changedAt,
        issue,
      ),
    )
    currentStatusId = change.newStatusId
    phaseStartedAt = change.changedAt
  }

  phases.push(createCurrentPhase(currentStatusId, phaseStartedAt, issue))
  return phases
}

function getConsistentStatusChanges(
  issue: StatusHistoryIssue,
  statusChanges: readonly StatusChange[],
): StatusChange[] {
  const consistentChanges: StatusChange[] = []
  let expectedStatusId = issue.status.id

  for (let index = statusChanges.length - 1; index >= 0; index -= 1) {
    const change = statusChanges[index]

    if (change.newStatusId !== expectedStatusId) {
      continue
    }

    consistentChanges.unshift(change)
    expectedStatusId = change.oldStatusId
  }

  return consistentChanges
}

function createCurrentPhase(
  statusId: number,
  startedAt: string,
  issue: StatusHistoryIssue,
): StatusPhase {
  const closedAt = getReliableClosedAt(startedAt, issue)

  return {
    statusId,
    statusName: getStatusName(statusId, issue),
    startedAt,
    endedAt: closedAt,
    durationMs: closedAt === null ? null : getDurationMs(startedAt, closedAt),
  }
}

function getReliableClosedAt(
  phaseStartedAt: string,
  issue: StatusHistoryIssue,
): string | null {
  if (!issue.status.is_closed || issue.closed_on === null) {
    return null
  }

  return getDurationMs(phaseStartedAt, issue.closed_on) === null
    ? null
    : issue.closed_on
}
