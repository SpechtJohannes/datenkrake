import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateCycleTime } from '../domain/cycleTime'
import { loadRedmineIssues } from './loadRedmineIssues'

const apiIssue = {
  id: 42,
  project: { id: 1, name: 'Example' },
  tracker: { id: 2, name: 'Story' },
  status: { id: 50, name: 'Done', is_closed: true },
  priority: { id: 4, name: 'Normal' },
  author: { id: 5, name: 'Example user' },
  subject: 'Example issue',
  description: 'not retained',
  created_on: '2026-01-01T00:00:00Z',
  updated_on: '2026-01-04T00:00:00Z',
  closed_on: '2026-01-04T00:00:00Z',
}

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => vi.unstubAllGlobals())

describe('loadRedmineIssues', () => {
  it('loads matching issues and status definitions as one data set', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/issue_statuses.json')) {
        return response({
          issue_statuses: [
            { id: 1, name: 'New', is_closed: false, position: 1 },
            { id: 20, name: 'Refined', is_closed: false, position: 2 },
            { id: 50, name: 'Done', is_closed: true, position: 3 },
          ],
        })
      }
      if (url.pathname.endsWith('/issues.json')) {
        return response({
          issues: [apiIssue],
          total_count: 1,
          offset: 0,
          limit: 100,
        })
      }
      return response({
        issue: {
          ...apiIssue,
          journals: [
            {
              id: 1,
              user: { id: 5, name: 'Example user' },
              notes: 'not retained',
              private_notes: true,
              created_on: '2026-01-02T00:00:00Z',
              details: [
                {
                  property: 'attr',
                  name: 'status_id',
                  old_value: '1',
                  new_value: '20',
                },
              ],
            },
            {
              id: 2,
              user: { id: 5, name: 'Example user' },
              notes: '',
              private_notes: false,
              created_on: '2026-01-04T00:00:00Z',
              details: [
                {
                  property: 'attr',
                  name: 'status_id',
                  old_value: '20',
                  new_value: '50',
                },
              ],
            },
          ],
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const dataSet = await loadRedmineIssues({
      baseUrl: 'https://redmine.example.test',
      apiKey: 'secret',
      query: { project_id: 7 },
    })

    expect(dataSet.statusDefinitions).toEqual([
      { id: 1, name: 'New', is_closed: false },
      { id: 20, name: 'Refined', is_closed: false },
      { id: 50, name: 'Done', is_closed: true },
    ])
    expect(dataSet.issues[0]).not.toHaveProperty('description')
    expect(dataSet.issues[0].journals[0]).not.toHaveProperty('notes')
    expect(
      calculateCycleTime(dataSet.issues[0], dataSet.statusDefinitions),
    ).toMatchObject({
      startedAt: '2026-01-02T00:00:00Z',
      endedAt: '2026-01-04T00:00:00Z',
      isRunning: false,
    })
  })

  it('rejects the whole load when the status catalog request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) => {
        const url = new URL(String(input))
        return url.pathname.endsWith('/issue_statuses.json')
          ? response({}, 500)
          : response({ issues: [], total_count: 0, offset: 0, limit: 100 })
      }),
    )

    await expect(
      loadRedmineIssues({
        baseUrl: 'https://redmine.example.test',
        apiKey: 'secret',
        query: {},
      }),
    ).rejects.toMatchObject({ kind: 'http', status: 500 })
  })
})
