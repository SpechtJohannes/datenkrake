import type { RedmineIssue } from '../data/types'
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
}: RedmineLoadRequest): Promise<readonly RedmineIssue[]> {
  const client = new RedmineClient({ baseUrl, apiKey })
  return new RedmineIssueRepository(client, query).getIssues()
}
