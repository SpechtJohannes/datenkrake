import type { Issue, IssueStatusJournal } from '../data/types'
import type {
  RedmineApiIssueWithJournals,
  RedmineApiJournal,
  RedmineApiJournalDetail,
} from './types'

function isCompleteStatusChange(detail: RedmineApiJournalDetail): boolean {
  return (
    detail.property === 'attr' &&
    detail.name === 'status_id' &&
    typeof detail.old_value === 'string' &&
    typeof detail.new_value === 'string'
  )
}

function mapStatusJournal(
  journal: RedmineApiJournal,
): IssueStatusJournal | null {
  const details = journal.details
    .filter(isCompleteStatusChange)
    .map((detail) => ({
      property: 'attr' as const,
      name: 'status_id' as const,
      old_value: detail.old_value as string,
      new_value: detail.new_value as string,
    }))

  return details.length === 0
    ? null
    : { id: journal.id, created_on: journal.created_on, details }
}

export function mapRedmineIssue(issue: RedmineApiIssueWithJournals): Issue {
  return {
    id: issue.id,
    subject: issue.subject,
    status: { ...issue.status },
    created_on: issue.created_on,
    closed_on: issue.closed_on ?? null,
    journals: issue.journals.flatMap((journal) => {
      const mapped = mapStatusJournal(journal)
      return mapped === null ? [] : [mapped]
    }),
  }
}

export function mapRedmineIssues(
  issues: readonly RedmineApiIssueWithJournals[],
): Issue[] {
  return issues.map(mapRedmineIssue)
}
