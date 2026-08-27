import { describe, expect, it, vi } from 'vitest'
import type { IssueRepository } from '../data/issueRepository'
import type { RedmineIssue } from '../data/types'
import { reconstructStatusHistory } from '../domain/statusHistory'
import { RedmineClient, RedmineApiError } from './redmineClient'
import { RedmineIssueRepository } from './redmineIssueRepository'
import type { RedmineApiIssueWithJournals } from './types'

function apiIssue(
  id: number,
  overrides: Partial<RedmineApiIssueWithJournals> = {},
): RedmineApiIssueWithJournals {
  return {
    id,
    project: { id: 1, name: 'Platform' },
    tracker: { id: 2, name: 'Story' },
    status: { id: 3, name: 'In Progress', is_closed: false },
    priority: { id: 4, name: 'Normal' },
    author: { id: 5, name: 'Ada' },
    subject: `Issue ${id}`,
    description: 'Description',
    created_on: '2026-08-01T08:00:00Z',
    updated_on: '2026-08-02T08:00:00Z',
    journals: [],
    ...overrides,
  }
}

describe('RedmineIssueRepository', () => {
  it('implements IssueRepository and maps one issue including journals', async () => {
    const source = apiIssue(42, {
      journals: [
        {
          id: 101,
          user: { id: 5, name: 'Ada' },
          notes: 'Started work',
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
      ],
    })
    const client = {
      getIssuesWithJournals: vi.fn().mockResolvedValue([source]),
    }
    const repository: IssueRepository = new RedmineIssueRepository(client, {
      project_id: 12,
      status_id: '*',
    })

    const result: readonly RedmineIssue[] = await repository.getIssues()

    expect(client.getIssuesWithJournals).toHaveBeenCalledOnce()
    expect(client.getIssuesWithJournals).toHaveBeenCalledWith({
      project_id: 12,
      status_id: '*',
    })
    expect(result).toEqual([{ ...source, closed_on: null }])
    expect(result[0]).not.toBe(source)
    expect(result[0].journals[0]).not.toBe(source.journals[0])
  })

  it('maps multiple issues', async () => {
    const client = {
      getIssuesWithJournals: vi
        .fn()
        .mockResolvedValue([apiIssue(1), apiIssue(2, { subject: 'Second' })]),
    }

    const result = await new RedmineIssueRepository(client).getIssues()

    expect(result.map(({ id, subject }) => ({ id, subject }))).toEqual([
      { id: 1, subject: 'Issue 1' },
      { id: 2, subject: 'Second' },
    ])
  })

  it('returns an empty internal issue collection for an empty client result', async () => {
    const client = { getIssuesWithJournals: vi.fn().mockResolvedValue([]) }

    await expect(
      new RedmineIssueRepository(client).getIssues(),
    ).resolves.toEqual([])
  })

  it('passes client errors through unchanged', async () => {
    const clientError = new RedmineApiError(
      'Redmine denied access to the requested resource.',
      'forbidden',
      403,
    )
    const client = {
      getIssuesWithJournals: vi.fn().mockRejectedValue(clientError),
    }

    const error = await new RedmineIssueRepository(client)
      .getIssues()
      .catch((reason: unknown) => reason)

    expect(error).toBe(clientError)
  })
})

describe('Redmine data pipeline integration', () => {
  it('maps a simulated API response through the repository into status history', async () => {
    const listIssue = apiIssue(42)
    const detailedIssue = apiIssue(42, {
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
    })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          issues: [listIssue],
          total_count: 1,
          offset: 0,
          limit: 100,
        }),
      )
      .mockResolvedValueOnce(Response.json({ issue: detailedIssue }))
    const client = new RedmineClient({
      baseUrl: 'https://redmine.example.test',
      apiKey: 'runtime-only-key',
      fetch: fetchMock,
    })

    const [mappedIssue] = await new RedmineIssueRepository(client, {
      project_id: 9,
    }).getIssues()
    const history = reconstructStatusHistory(mappedIssue, [
      { id: 1, name: 'New', is_closed: false },
      { id: 3, name: 'In Progress', is_closed: false },
      { id: 5, name: 'Done', is_closed: true },
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(history.map(({ statusId }) => statusId)).toEqual([1, 3, 5])
    expect(history.at(-1)).toMatchObject({
      statusName: 'Done',
      endedAt: '2026-08-04T12:00:00Z',
    })
  })
})
