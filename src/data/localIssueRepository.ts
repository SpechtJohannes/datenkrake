import mockIssues from './mock/issues.json'
import type { IssueRepository } from './issueRepository'
import type { RedmineIssuesResponse } from './types'
import { mapRedmineIssues } from '../redmine/redmineIssueMapper'

const mockResponse: RedmineIssuesResponse = mockIssues

export const localIssueRepository: IssueRepository = {
  async getIssues() {
    return mapRedmineIssues(mockResponse.issues)
  },
}
