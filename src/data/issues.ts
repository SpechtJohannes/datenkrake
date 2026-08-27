import type { IssueRepository } from './issueRepository'
import { localIssueRepository } from './localIssueRepository'
import type { RedmineIssue } from './types'

const issueRepository: IssueRepository = localIssueRepository

export function getIssues(): Promise<readonly RedmineIssue[]> {
  return issueRepository.getIssues()
}

export type {
  RedmineCustomField,
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
  RedmineReference,
  RedmineStatus,
} from './types'
