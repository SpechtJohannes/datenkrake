import { describe, expect, it, vi } from 'vitest'
import { RedmineApiError, RedmineClient } from './redmineClient'

const issue = (id: number) => ({
  id,
  project: { id: 1, name: 'Project' },
  tracker: { id: 2, name: 'Story' },
  status: { id: 3, name: 'Open', is_closed: false },
  priority: { id: 4, name: 'Normal' },
  author: { id: 5, name: 'Ada' },
  subject: `Issue ${id}`,
  description: 'Description',
  created_on: '2026-08-01T10:00:00Z',
  updated_on: '2026-08-02T10:00:00Z',
})

const page = (
  issues: ReturnType<typeof issue>[],
  totalCount = issues.length,
  offset = 0,
) => ({
  issues,
  total_count: totalCount,
  offset,
  limit: 100,
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const createClient = (fetchImplementation: typeof fetch) =>
  new RedmineClient({
    baseUrl: 'https://redmine.example.test/redmine',
    apiKey: 'secret-api-key',
    fetch: fetchImplementation,
  })

function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('RedmineClient', () => {
  it('loads and minimizes the Redmine issue status catalog', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        issue_statuses: [
          {
            id: 20,
            name: 'Refined',
            is_closed: false,
            position: 4,
            default_done_ratio: 10,
          },
          { id: 50, name: 'Done', is_closed: true, position: 9 },
        ],
      }),
    )
    const client = createClient(fetchMock)

    await expect(client.getIssueStatuses()).resolves.toEqual([
      { id: 20, name: 'Refined', is_closed: false },
      { id: 50, name: 'Done', is_closed: true },
    ])
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/redmine/issue_statuses.json',
    )
  })

  it('rejects an invalid issue status catalog response', async () => {
    const client = createClient(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ issue_statuses: [{ id: 1 }] })),
    )

    await expect(client.getIssueStatuses()).rejects.toMatchObject({
      kind: 'invalid-response',
    })
  })

  it.each([
    'http://redmine.example.test',
    'https://user@redmine.example.test',
    'https://user:password@redmine.example.test',
    'invalid',
    'https://',
  ])('rejects %s before a network request can be made', async (baseUrl) => {
    const fetchMock = vi.fn<typeof fetch>()

    expect(
      () =>
        new RedmineClient({
          baseUrl,
          apiKey: 'secret-api-key',
          fetch: fetchMock,
        }),
    ).toThrow('gültige HTTPS-URL ohne eingebettete Zugangsdaten')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads issues and forwards filters, pagination parameters, and the API header', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(page([issue(1)])))
    const client = createClient(fetchMock)

    await expect(
      client.getIssues({
        project_id: 12,
        status_id: '*',
        assigned_to_id: [7, 8],
        limit: 25,
      }),
    ).resolves.toEqual([issue(1)])

    expect(fetchMock).toHaveBeenCalledOnce()
    const [requestUrl, init] = fetchMock.mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.origin + url.pathname).toBe(
      'https://redmine.example.test/redmine/issues.json',
    )
    expect(url.searchParams.get('project_id')).toBe('12')
    expect(url.searchParams.get('status_id')).toBe('*')
    expect(url.searchParams.getAll('assigned_to_id')).toEqual(['7', '8'])
    expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.get('offset')).toBe('0')
    expect(new Headers(init?.headers).get('X-Redmine-API-Key')).toBe(
      'secret-api-key',
    )
    expect(init?.redirect).toBe('error')
  })

  it('loads every page using the offsets returned by Redmine', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(page([issue(1), issue(2)], 3, 0)))
      .mockResolvedValueOnce(jsonResponse(page([issue(3)], 3, 2)))
    const client = createClient(fetchMock)

    await expect(client.getIssues({ limit: 2 })).resolves.toEqual([
      issue(1),
      issue(2),
      issue(3),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('offset'),
    ).toBe('0')
    expect(
      new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('offset'),
    ).toBe('2')
  })

  it('loads an issue detail including journals', async () => {
    const journal = {
      id: 10,
      user: { id: 5, name: 'Ada' },
      notes: 'Moved forward',
      created_on: '2026-08-03T10:00:00Z',
      private_notes: false,
      details: [
        { property: 'attr', name: 'status_id', old_value: '3', new_value: '4' },
      ],
    }
    const detailedIssue = { ...issue(42), journals: [journal] }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ issue: detailedIssue }))
    const client = createClient(fetchMock)

    await expect(client.getIssueWithJournals(42)).resolves.toEqual(
      detailedIssue,
    )
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe('/redmine/issues/42.json')
    expect(url.searchParams.get('include')).toBe('journals')
  })

  it('determines issues first and then loads all journal details', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(page([issue(1), issue(2)])))
      .mockResolvedValueOnce(
        jsonResponse({ issue: { ...issue(1), journals: [] } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ issue: { ...issue(2), journals: [] } }),
      )
    const client = createClient(fetchMock)

    await expect(
      client.getIssuesWithJournals({ project_id: 9 }),
    ).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.redirect === 'error'),
    ).toBe(true)
  })

  it('runs at most five issue detail requests and preserves issue order', async () => {
    const listedIssues = Array.from({ length: 8 }, (_, index) =>
      issue(index + 1),
    )
    const pendingDetails = new Map<
      number,
      ReturnType<typeof deferredResponse>
    >()
    let activeDetailRequests = 0
    let maximumActiveDetailRequests = 0
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/issues.json')) {
        return jsonResponse(page(listedIssues))
      }

      const issueId = Number(url.pathname.match(/issues\/(\d+)\.json$/)?.[1])
      const pending = deferredResponse()
      pendingDetails.set(issueId, pending)
      activeDetailRequests += 1
      maximumActiveDetailRequests = Math.max(
        maximumActiveDetailRequests,
        activeDetailRequests,
      )
      try {
        return await pending.promise
      } finally {
        activeDetailRequests -= 1
      }
    })
    const client = createClient(fetchMock)

    const resultPromise = client.getIssuesWithJournals()
    await vi.waitFor(() => expect(pendingDetails.size).toBe(5))
    expect(maximumActiveDetailRequests).toBe(5)

    pendingDetails
      .get(3)
      ?.resolve(jsonResponse({ issue: { ...issue(3), journals: [] } }))
    await vi.waitFor(() => expect(pendingDetails.size).toBe(6))

    for (const issueId of [1, 2, 4, 5, 6]) {
      pendingDetails
        .get(issueId)
        ?.resolve(jsonResponse({ issue: { ...issue(issueId), journals: [] } }))
    }
    await vi.waitFor(() => expect(pendingDetails.size).toBe(8))
    for (const issueId of [7, 8]) {
      pendingDetails
        .get(issueId)
        ?.resolve(jsonResponse({ issue: { ...issue(issueId), journals: [] } }))
    }

    await expect(resultPromise).resolves.toEqual(
      listedIssues.map((listedIssue) => ({ ...listedIssue, journals: [] })),
    )
    expect(maximumActiveDetailRequests).toBe(5)
    expect(pendingDetails.size).toBe(listedIssues.length)
  })

  it('forwards an issue detail request failure', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(page([issue(1), issue(2)])))
      .mockResolvedValueOnce(
        jsonResponse({ issue: { ...issue(1), journals: [] } }),
      )
      .mockResolvedValueOnce(jsonResponse({}, 403))
    const client = createClient(fetchMock)

    await expect(client.getIssuesWithJournals()).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('blocks redirects for issue status catalog requests', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('redirect blocked'))
    const client = createClient(fetchMock)

    await expect(client.getIssueStatuses()).rejects.toMatchObject({
      kind: 'network',
      message: 'The Redmine instance could not be reached.',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1]?.redirect).toBe('error')
  })

  it.each([
    ['cross-origin', 'https://other.example.test/issues.json'],
    ['protocol downgrade', 'http://redmine.example.test/issues.json'],
  ])(
    'does not follow a %s redirect or expose credentials',
    async (_description, redirectTarget) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(async (_input, init) => {
          if (init?.redirect === 'error') {
            throw new TypeError(
              `Redirect to ${redirectTarget} blocked for secret-api-key`,
            )
          }
          return jsonResponse(page([issue(1)]))
        })
      const client = createClient(fetchMock)

      const error = await client.getIssues().catch((reason: unknown) => reason)
      expect(error).toMatchObject({
        kind: 'network',
        message: 'The Redmine instance could not be reached.',
      })
      expect(String(error)).not.toContain('secret-api-key')
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(fetchMock.mock.calls[0][1]?.redirect).toBe('error')
    },
  )

  it.each([
    [401, 'unauthorized', 'Redmine authentication failed. Check the API key.'],
    [403, 'forbidden', 'Redmine denied access to the requested resource.'],
    [500, 'http', 'Redmine request failed with HTTP status 500.'],
  ] as const)(
    'reports HTTP %i without exposing credentials',
    async (status, kind, message) => {
      const client = createClient(
        vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, status)),
      )

      const error = await client.getIssues().catch((reason: unknown) => reason)
      expect(error).toBeInstanceOf(RedmineApiError)
      expect(error).toMatchObject({ kind, status, message })
      expect(String(error)).not.toContain('secret-api-key')
    },
  )

  it('reports unreachable instances without exposing credentials', async () => {
    const client = createClient(
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('request failed: secret-api-key')),
    )

    await expect(client.getIssues()).rejects.toMatchObject({
      kind: 'network',
      message: 'The Redmine instance could not be reached.',
    })
  })

  it.each([
    {},
    { issues: 'not-an-array', total_count: 1, offset: 0, limit: 100 },
    { issues: [{ id: 1 }], total_count: 1, offset: 0, limit: 100 },
  ])('rejects an unexpected issues response', async (body) => {
    const client = createClient(
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body)),
    )

    await expect(client.getIssues()).rejects.toMatchObject({
      kind: 'invalid-response',
    })
  })

  it('rejects issue details without journals', async () => {
    const client = createClient(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ issue: issue(1) })),
    )

    await expect(client.getIssueWithJournals(1)).rejects.toMatchObject({
      kind: 'invalid-response',
    })
  })
})
