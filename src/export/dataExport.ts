import type {
  Issue,
  IssueStatusChange,
  IssueStatusJournal,
  RedmineStatus,
} from '../data/types'

export const DATA_EXPORT_FORMAT = 'datenkrake'
export const DATA_EXPORT_VERSION = 2

export interface DataExportV2 {
  format: typeof DATA_EXPORT_FORMAT
  version: typeof DATA_EXPORT_VERSION
  exportedAt: string
  issues: Issue[]
}

function copyStatus(status: RedmineStatus): RedmineStatus {
  return { id: status.id, name: status.name, is_closed: status.is_closed }
}

type CompleteStatusChange = IssueStatusChange & {
  old_value: string
  new_value: string
}

function isCompleteStatusChange(
  detail: IssueStatusChange,
): detail is CompleteStatusChange {
  return (
    detail.property === 'attr' &&
    detail.name === 'status_id' &&
    typeof detail.old_value === 'string' &&
    typeof detail.new_value === 'string'
  )
}

function copyStatusChange(detail: CompleteStatusChange): IssueStatusChange {
  return {
    property: 'attr',
    name: 'status_id',
    old_value: detail.old_value,
    new_value: detail.new_value,
  }
}

function copyJournal(journal: IssueStatusJournal): IssueStatusJournal | null {
  const details = journal.details
    .filter(isCompleteStatusChange)
    .map(copyStatusChange)

  return details.length === 0
    ? null
    : {
        id: journal.id,
        created_on: journal.created_on,
        details,
      }
}

function copyIssue(issue: Issue): Issue {
  return {
    id: issue.id,
    subject: issue.subject,
    status: copyStatus(issue.status),
    created_on: issue.created_on,
    closed_on: issue.closed_on,
    journals: issue.journals.flatMap((journal) => {
      const copied = copyJournal(journal)
      return copied === null ? [] : [copied]
    }),
  }
}

export function createDataExport(
  issues: readonly Issue[],
  exportedAt: Date,
): DataExportV2 {
  return {
    format: DATA_EXPORT_FORMAT,
    version: DATA_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    issues: issues.map(copyIssue),
  }
}

export function serializeDataExport(dataExport: DataExportV2): string {
  return JSON.stringify(dataExport, null, 2)
}

export function createDataExportFileName(exportedAt: Date): string {
  const year = exportedAt.getUTCFullYear()
  const month = String(exportedAt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(exportedAt.getUTCDate()).padStart(2, '0')
  return `datenkrake_${year}_${month}_${day}.json`
}
