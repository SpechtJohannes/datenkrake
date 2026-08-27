export interface RedmineReference {
  id: number
  name: string
}

export interface RedmineStatus extends RedmineReference {
  is_closed: boolean
}

export type StatusDefinition = RedmineStatus

export interface RedmineCustomField {
  id: number
  name: string
  value: string
}

export interface RedmineJournalDetail {
  property: string
  name: string
  old_value: string
  new_value: string
}

export interface RedmineJournal {
  id: number
  user: RedmineReference
  notes: string
  created_on: string
  private_notes: boolean
  details: RedmineJournalDetail[]
}

export interface RedmineIssue {
  id: number
  project: RedmineReference
  tracker: RedmineReference
  status: RedmineStatus
  priority: RedmineReference
  author: RedmineReference
  assigned_to: RedmineReference
  category: RedmineReference
  fixed_version: RedmineReference
  subject: string
  description: string
  start_date: string
  due_date: string
  done_ratio: number
  is_private: boolean
  estimated_hours: number
  total_estimated_hours: null
  spent_hours: number
  total_spent_hours: null
  custom_fields: RedmineCustomField[]
  created_on: string
  updated_on: string
  closed_on: string | null
  journals: RedmineJournal[]
}

export interface RedmineIssuesResponse {
  issues: RedmineIssue[]
  total_count: number
  offset: number
  limit: number
  mock_note: string
}
