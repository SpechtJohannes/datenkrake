import type { IssueRepository } from './issueRepository'
import { localIssueRepository } from './localIssueRepository'
import type { Issue } from './types'

const issueRepository: IssueRepository = localIssueRepository

export function getIssues(): Promise<readonly Issue[]> {
  return issueRepository.getIssues()
}

export type {
  Issue,
  IssueStatusChange,
  IssueStatusJournal,
  RedmineCustomField,
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
  RedmineReference,
  RedmineStatus,
  StatusDefinition,
} from './types'
