import type {
  RedmineCustomField,
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
  RedmineReference,
  RedmineStatus,
} from '../data/types'

export const DATA_EXPORT_FORMAT = 'datenkrake'
export const DATA_EXPORT_VERSION = 1

export interface DataExportV1 {
  format: typeof DATA_EXPORT_FORMAT
  version: typeof DATA_EXPORT_VERSION
  exportedAt: string
  issues: RedmineIssue[]
}

function copyReference(reference: RedmineReference): RedmineReference {
  return { id: reference.id, name: reference.name }
}

function copyStatus(status: RedmineStatus): RedmineStatus {
  return { ...copyReference(status), is_closed: status.is_closed }
}

function copyCustomField(field: RedmineCustomField): RedmineCustomField {
  return { id: field.id, name: field.name, value: field.value }
}

function copyJournalDetail(detail: RedmineJournalDetail): RedmineJournalDetail {
  const copied: RedmineJournalDetail = {
    property: detail.property,
    name: detail.name,
  }
  if (detail.old_value !== undefined) copied.old_value = detail.old_value
  if (detail.new_value !== undefined) copied.new_value = detail.new_value
  return copied
}

function copyJournal(journal: RedmineJournal): RedmineJournal {
  return {
    id: journal.id,
    user: copyReference(journal.user),
    notes: journal.notes,
    created_on: journal.created_on,
    private_notes: journal.private_notes,
    details: journal.details.map(copyJournalDetail),
  }
}

function copyIssue(issue: RedmineIssue): RedmineIssue {
  const copied: RedmineIssue = {
    id: issue.id,
    project: copyReference(issue.project),
    tracker: copyReference(issue.tracker),
    status: copyStatus(issue.status),
    priority: copyReference(issue.priority),
    author: copyReference(issue.author),
    subject: issue.subject,
    description: issue.description,
    created_on: issue.created_on,
    updated_on: issue.updated_on,
    closed_on: issue.closed_on,
    journals: issue.journals.map(copyJournal),
  }
  if (issue.assigned_to !== undefined)
    copied.assigned_to = copyReference(issue.assigned_to)
  if (issue.category !== undefined)
    copied.category = copyReference(issue.category)
  if (issue.fixed_version !== undefined)
    copied.fixed_version = copyReference(issue.fixed_version)
  if (issue.start_date !== undefined) copied.start_date = issue.start_date
  if (issue.due_date !== undefined) copied.due_date = issue.due_date
  if (issue.done_ratio !== undefined) copied.done_ratio = issue.done_ratio
  if (issue.is_private !== undefined) copied.is_private = issue.is_private
  if (issue.estimated_hours !== undefined)
    copied.estimated_hours = issue.estimated_hours
  if (issue.total_estimated_hours !== undefined) {
    copied.total_estimated_hours = issue.total_estimated_hours
  }
  if (issue.spent_hours !== undefined) copied.spent_hours = issue.spent_hours
  if (issue.total_spent_hours !== undefined)
    copied.total_spent_hours = issue.total_spent_hours
  if (issue.custom_fields !== undefined) {
    copied.custom_fields = issue.custom_fields.map(copyCustomField)
  }
  return copied
}

export function createDataExport(
  issues: readonly RedmineIssue[],
  exportedAt: Date,
): DataExportV1 {
  return {
    format: DATA_EXPORT_FORMAT,
    version: DATA_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    issues: issues.map(copyIssue),
  }
}

export function serializeDataExport(dataExport: DataExportV1): string {
  return JSON.stringify(dataExport, null, 2)
}

export function createDataExportFileName(exportedAt: Date): string {
  const year = exportedAt.getUTCFullYear()
  const month = String(exportedAt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(exportedAt.getUTCDate()).padStart(2, '0')
  return `datenkrake_${year}_${month}_${day}.json`
}
