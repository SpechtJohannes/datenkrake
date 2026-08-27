import type {
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
} from '../data/types'
import type {
  RedmineApiIssueWithJournals,
  RedmineApiJournal,
  RedmineApiJournalDetail,
} from './types'

function mapJournalDetail(
  detail: RedmineApiJournalDetail,
): RedmineJournalDetail {
  return {
    property: detail.property,
    name: detail.name,
    old_value: detail.old_value,
    new_value: detail.new_value,
  }
}

function mapJournal(journal: RedmineApiJournal): RedmineJournal {
  return {
    id: journal.id,
    user: { ...journal.user },
    notes: journal.notes,
    created_on: journal.created_on,
    private_notes: journal.private_notes,
    details: journal.details.map(mapJournalDetail),
  }
}

export function mapRedmineIssue(
  issue: RedmineApiIssueWithJournals,
): RedmineIssue {
  return {
    id: issue.id,
    project: { ...issue.project },
    tracker: { ...issue.tracker },
    status: { ...issue.status },
    priority: { ...issue.priority },
    author: { ...issue.author },
    assigned_to:
      issue.assigned_to === undefined ? undefined : { ...issue.assigned_to },
    category: issue.category === undefined ? undefined : { ...issue.category },
    fixed_version:
      issue.fixed_version === undefined
        ? undefined
        : { ...issue.fixed_version },
    subject: issue.subject,
    description: issue.description,
    start_date: issue.start_date,
    due_date: issue.due_date,
    done_ratio: issue.done_ratio,
    is_private: issue.is_private,
    estimated_hours: issue.estimated_hours,
    total_estimated_hours: issue.total_estimated_hours,
    spent_hours: issue.spent_hours,
    total_spent_hours: issue.total_spent_hours,
    custom_fields: issue.custom_fields?.map((field) => ({ ...field })),
    created_on: issue.created_on,
    updated_on: issue.updated_on,
    closed_on: issue.closed_on ?? null,
    journals: issue.journals.map(mapJournal),
  }
}

export function mapRedmineIssues(
  issues: readonly RedmineApiIssueWithJournals[],
): RedmineIssue[] {
  return issues.map(mapRedmineIssue)
}
