import type { DataSet } from '../data/dataSet'
import { RedmineClient } from './redmineClient'
import { RedmineIssueRepository } from './redmineIssueRepository'
import type { RedmineIssueQuery } from './types'

export interface RedmineLoadRequest {
  baseUrl: string
  apiKey: string
  query: RedmineIssueQuery
}

export async function loadRedmineIssues({
  baseUrl,
  apiKey,
  query,
}: RedmineLoadRequest): Promise<DataSet> {
  const client = new RedmineClient({ baseUrl, apiKey })
  const [issues, statusDefinitions] = await Promise.all([
    new RedmineIssueRepository(client, query).getIssues(),
    client.getIssueStatuses(),
  ])
  return { issues, statusDefinitions }
}
