export interface RedmineApiReference {
  id: number
  name: string
}

export interface RedmineApiStatus extends RedmineApiReference {
  is_closed: boolean
}

export interface RedmineApiCustomField {
  id: number
  name: string
  value: string
}

export interface RedmineApiIssue {
  id: number
  project: RedmineApiReference
  tracker: RedmineApiReference
  status: RedmineApiStatus
  priority: RedmineApiReference
  author: RedmineApiReference
  subject: string
  description: string
  assigned_to?: RedmineApiReference
  category?: RedmineApiReference
  fixed_version?: RedmineApiReference
  start_date?: string | null
  due_date?: string | null
  done_ratio?: number
  is_private?: boolean
  estimated_hours?: number
  total_estimated_hours?: number | null
  spent_hours?: number
  total_spent_hours?: number | null
  custom_fields?: RedmineApiCustomField[]
  created_on: string
  updated_on: string
  closed_on?: string | null
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
