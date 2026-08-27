import type { RedmineIssue } from './types'

export interface IssueRepository {
  getIssues(): Promise<readonly RedmineIssue[]>
}
