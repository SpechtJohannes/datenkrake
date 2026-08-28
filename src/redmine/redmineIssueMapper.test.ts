import { describe, expect, it } from 'vitest'
import { reconstructStatusHistory } from '../domain/statusHistory'
import { mapRedmineIssue, mapRedmineIssues } from './redmineIssueMapper'
import type { RedmineApiIssueWithJournals } from './types'

function apiIssue(
  overrides: Partial<RedmineApiIssueWithJournals> = {},
): RedmineApiIssueWithJournals {
  return {
    id: 42,
    project: { id: 1, name: 'Platform' },
    tracker: { id: 2, name: 'Story' },
    status: { id: 3, name: 'In Progress', is_closed: false },
    priority: { id: 4, name: 'Normal' },
    author: { id: 5, name: 'Ada' },
    subject: 'Map Redmine data',
    description: 'A realistic issue',
    created_on: '2026-08-01T08:00:00Z',
    updated_on: '2026-08-03T10:00:00Z',
    journals: [],
    ...overrides,
  }
}

describe('mapRedmineIssue', () => {
  it('maps only the fields required by the domain', () => {
    const source = apiIssue({
      assigned_to: { id: 6, name: 'Grace' },
      category: { id: 7, name: 'Backend' },
      fixed_version: { id: 8, name: '1.0' },
      start_date: '2026-08-01',
      due_date: '2026-08-10',
      done_ratio: 50,
      is_private: false,
      estimated_hours: 8,
      total_estimated_hours: 8,
      spent_hours: 3,
      total_spent_hours: 3,
      custom_fields: [{ id: 9, name: 'Team', value: 'Alpha' }],
      closed_on: null,
    })

    const mapped = mapRedmineIssue(source)

    expect(mapped).toEqual({
      id: 42,
      subject: 'Map Redmine data',
      status: { id: 3, name: 'In Progress', is_closed: false },
      created_on: '2026-08-01T08:00:00Z',
      closed_on: null,
      journals: [],
    })
    expect(mapped).not.toBe(source)
    expect(mapped.status).not.toBe(source.status)
    expect(mapped).not.toHaveProperty('author')
    expect(mapped).not.toHaveProperty('assigned_to')
    expect(mapped).not.toHaveProperty('description')
    expect(mapped).not.toHaveProperty('custom_fields')
  })

  it('keeps an open issue without a closing timestamp', () => {
    const mapped = mapRedmineIssue(apiIssue())

    expect(mapped.status).toEqual({
      id: 3,
      name: 'In Progress',
      is_closed: false,
    })
    expect(mapped.closed_on).toBeNull()
    expect(mapped.created_on).toBe('2026-08-01T08:00:00Z')
    expect(mapped).not.toHaveProperty('updated_on')
  })

  it('preserves the closing timestamp of a completed issue', () => {
    const mapped = mapRedmineIssue(
      apiIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-08-04T12:00:00Z',
      }),
    )

    expect(mapped.status.is_closed).toBe(true)
    expect(mapped.closed_on).toBe('2026-08-04T12:00:00Z')
  })

  it('maps an issue without journals to an empty collection', () => {
    expect(mapRedmineIssue(apiIssue()).journals).toEqual([])
  })

  it('keeps only status changes and discards journal metadata', () => {
    const mapped = mapRedmineIssue(
      apiIssue({
        journals: [
          {
            id: 101,
            user: { id: 5, name: 'Ada' },
            notes: 'Started',
            created_on: '2026-08-02T09:00:00Z',
            private_notes: false,
            details: [
              {
                property: 'attr',
                name: 'status_id',
                old_value: '1',
                new_value: '3',
              },
              {
                property: 'attr',
                name: 'done_ratio',
                old_value: '0',
                new_value: '20',
              },
            ],
          },
          {
            id: 102,
            user: { id: 6, name: 'Grace' },
            notes: '',
            created_on: '2026-08-03T09:00:00Z',
            private_notes: true,
            details: [],
          },
        ],
      }),
    )

    expect(
      mapped.journals.map(({ id, created_on }) => ({ id, created_on })),
    ).toEqual([{ id: 101, created_on: '2026-08-02T09:00:00Z' }])
    expect(mapped.journals[0].details).toEqual([
      { property: 'attr', name: 'status_id', old_value: '1', new_value: '3' },
    ])
    expect(mapped.journals[0]).not.toHaveProperty('user')
    expect(mapped.journals[0]).not.toHaveProperty('notes')
    expect(mapped.journals[0]).not.toHaveProperty('private_notes')
  })

  it('drops journals that do not contain a complete status change', () => {
    const mapped = mapRedmineIssue(
      apiIssue({
        journals: [
          {
            id: 103,
            user: { id: 5, name: 'Ada' },
            notes: '',
            created_on: '2026-08-03T09:00:00Z',
            private_notes: false,
            details: [
              { property: 'attr', name: 'assigned_to_id', old_value: null },
            ],
          },
        ],
      }),
    )

    expect(mapped).not.toHaveProperty('assigned_to')
    expect(mapped).not.toHaveProperty('category')
    expect(mapped.journals).toEqual([])
  })
})

describe('mapRedmineIssues', () => {
  it('maps multiple issues through the single-issue mapper', () => {
    const mapped = mapRedmineIssues([
      apiIssue({ id: 1, subject: 'First' }),
      apiIssue({ id: 2, subject: 'Second' }),
    ])

    expect(mapped.map(({ id, subject }) => ({ id, subject }))).toEqual([
      { id: 1, subject: 'First' },
      { id: 2, subject: 'Second' },
    ])
  })
})

describe('mapped issue integration', () => {
  it('works with status history reconstruction without Redmine-specific handling', () => {
    const mapped = mapRedmineIssue(
      apiIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-08-04T12:00:00Z',
        journals: [
          {
            id: 201,
            user: { id: 5, name: 'Ada' },
            notes: '',
            created_on: '2026-08-02T09:00:00Z',
            private_notes: false,
            details: [
              {
                property: 'attr',
                name: 'status_id',
                old_value: '1',
                new_value: '3',
              },
            ],
          },
          {
            id: 202,
            user: { id: 5, name: 'Ada' },
            notes: '',
            created_on: '2026-08-03T10:00:00Z',
            private_notes: false,
            details: [
              {
                property: 'attr',
                name: 'status_id',
                old_value: '3',
                new_value: '5',
              },
            ],
          },
        ],
      }),
    )

    expect(
      reconstructStatusHistory(mapped, [
        { id: 1, name: 'New', is_closed: false },
        { id: 3, name: 'In Progress', is_closed: false },
        { id: 5, name: 'Done', is_closed: true },
      ]).map(({ statusId, startedAt, endedAt }) => ({
        statusId,
        startedAt,
        endedAt,
      })),
    ).toEqual([
      {
        statusId: 1,
        startedAt: '2026-08-01T08:00:00Z',
        endedAt: '2026-08-02T09:00:00Z',
      },
      {
        statusId: 3,
        startedAt: '2026-08-02T09:00:00Z',
        endedAt: '2026-08-03T10:00:00Z',
      },
      {
        statusId: 5,
        startedAt: '2026-08-03T10:00:00Z',
        endedAt: '2026-08-04T12:00:00Z',
      },
    ])
  })
})
