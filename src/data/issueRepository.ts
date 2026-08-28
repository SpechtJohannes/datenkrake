import type { Issue } from './types'

export interface IssueRepository {
  getIssues(): Promise<readonly Issue[]>
}
