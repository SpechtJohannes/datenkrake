import mockIssues from './mock/issues.json'
import type { IssueRepository } from './issueRepository'
import type { RedmineIssuesResponse } from './types'

const mockResponse: RedmineIssuesResponse = mockIssues

export const localIssueRepository: IssueRepository = {
  async getIssues() {
    return mockResponse.issues
  },
}
