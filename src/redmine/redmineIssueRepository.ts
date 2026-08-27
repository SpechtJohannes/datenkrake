import type { IssueRepository } from '../data/issueRepository'
import { mapRedmineIssues } from './redmineIssueMapper'
import type { RedmineClient } from './redmineClient'
import type { RedmineIssueQuery } from './types'

type RedmineIssuesClient = Pick<RedmineClient, 'getIssuesWithJournals'>

export class RedmineIssueRepository implements IssueRepository {
  private readonly client: RedmineIssuesClient
  private readonly query: RedmineIssueQuery

  constructor(client: RedmineIssuesClient, query: RedmineIssueQuery = {}) {
    this.client = client
    this.query = query
  }

  async getIssues() {
    const redmineIssues = await this.client.getIssuesWithJournals(this.query)
    return mapRedmineIssues(redmineIssues)
  }
}
