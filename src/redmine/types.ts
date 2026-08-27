export interface RedmineApiReference {
  id: number
  name: string
}

export interface RedmineApiIssue {
  id: number
  project: RedmineApiReference
  tracker: RedmineApiReference
  status: RedmineApiReference
  priority: RedmineApiReference
  author: RedmineApiReference
  subject: string
  description: string
  created_on: string
  updated_on: string
}

export interface RedmineApiJournalDetail {
  property: string
  name: string
  old_value?: string | null
  new_value?: string | null
}

export interface RedmineApiJournal {
  id: number
  user: RedmineApiReference
  notes: string
  created_on: string
  private_notes: boolean
  details: RedmineApiJournalDetail[]
}

export interface RedmineApiIssueWithJournals extends RedmineApiIssue {
  journals: RedmineApiJournal[]
}

export interface RedmineApiIssuesPage {
  issues: RedmineApiIssue[]
  total_count: number
  offset: number
  limit: number
}

export interface RedmineApiIssueResponse {
  issue: RedmineApiIssueWithJournals
}

export type RedmineQueryValue = string | number | boolean

export type RedmineIssueQuery = Readonly<
  Record<string, RedmineQueryValue | readonly RedmineQueryValue[] | undefined>
>
