import type {
  RedmineApiIssue,
  RedmineApiIssueResponse,
  RedmineApiIssuesPage,
  RedmineApiIssueWithJournals,
  RedmineIssueQuery,
  RedmineQueryValue,
} from './types'
import { validateRedmineBaseUrl } from './redmineBaseUrl'

export type RedmineErrorKind =
  'network' | 'unauthorized' | 'forbidden' | 'http' | 'invalid-response'

export class RedmineApiError extends Error {
  readonly kind: RedmineErrorKind
  readonly status?: number

  constructor(message: string, kind: RedmineErrorKind, status?: number) {
    super(message)
    this.name = 'RedmineApiError'
    this.kind = kind
    this.status = status
  }
}

export interface RedmineClientOptions {
  baseUrl: string
  apiKey: string
  fetch?: typeof globalThis.fetch
}

const DEFAULT_PAGE_SIZE = 100

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isReference(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string'
  )
}

function isStatus(value: unknown): boolean {
  return (
    isReference(value) &&
    isRecord(value) &&
    typeof value.is_closed === 'boolean'
  )
}

function isIssue(value: unknown): value is RedmineApiIssue {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    isReference(value.project) &&
    isReference(value.tracker) &&
    isStatus(value.status) &&
    isReference(value.priority) &&
    isReference(value.author) &&
    typeof value.subject === 'string' &&
    typeof value.description === 'string' &&
    typeof value.created_on === 'string' &&
    typeof value.updated_on === 'string'
  )
}

function isJournalDetail(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.property !== 'string' || typeof value.name !== 'string')
    return false
  return ['old_value', 'new_value'].every(
    (key) =>
      value[key] === undefined ||
      value[key] === null ||
      typeof value[key] === 'string',
  )
}

function isJournal(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    isReference(value.user) &&
    typeof value.notes === 'string' &&
    typeof value.created_on === 'string' &&
    typeof value.private_notes === 'boolean' &&
    Array.isArray(value.details) &&
    value.details.every(isJournalDetail)
  )
}

function isIssueWithJournals(
  value: unknown,
): value is RedmineApiIssueWithJournals {
  return (
    isIssue(value) &&
    isRecord(value) &&
    Array.isArray(value.journals) &&
    value.journals.every(isJournal)
  )
}

function parseIssuesPage(value: unknown): RedmineApiIssuesPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.issues) ||
    !value.issues.every(isIssue) ||
    typeof value.total_count !== 'number' ||
    typeof value.offset !== 'number' ||
    typeof value.limit !== 'number' ||
    value.total_count < 0 ||
    value.offset < 0 ||
    value.limit <= 0
  ) {
    throw new RedmineApiError(
      'Redmine returned an unexpected issues response.',
      'invalid-response',
    )
  }
  return value as unknown as RedmineApiIssuesPage
}

function parseIssueResponse(value: unknown): RedmineApiIssueResponse {
  if (!isRecord(value) || !isIssueWithJournals(value.issue)) {
    throw new RedmineApiError(
      'Redmine returned an unexpected issue detail response.',
      'invalid-response',
    )
  }
  return value as unknown as RedmineApiIssueResponse
}

function appendQueryValue(
  searchParams: URLSearchParams,
  key: string,
  value: RedmineQueryValue | readonly RedmineQueryValue[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => searchParams.append(key, String(entry)))
  } else {
    searchParams.set(key, String(value))
  }
}

export class RedmineClient {
  private readonly baseUrl: URL
  private readonly apiKey: string
  private readonly fetchImplementation: typeof globalThis.fetch

  constructor(options: RedmineClientOptions) {
    const baseUrl = validateRedmineBaseUrl(options.baseUrl)
    if (!baseUrl.pathname.endsWith('/')) baseUrl.pathname += '/'
    this.baseUrl = baseUrl
    this.apiKey = options.apiKey
    this.fetchImplementation = options.fetch ?? globalThis.fetch
  }

  async getIssues(query: RedmineIssueQuery = {}): Promise<RedmineApiIssue[]> {
    const requestedLimit =
      this.readNonNegativeInteger(query.limit, 'limit') ?? DEFAULT_PAGE_SIZE
    if (requestedLimit === 0) {
      throw new RedmineApiError(
        'The Redmine issue limit must be greater than zero.',
        'invalid-response',
      )
    }
    let nextOffset = this.readNonNegativeInteger(query.offset, 'offset') ?? 0
    const issues: RedmineApiIssue[] = []

    while (true) {
      const page = await this.getIssuesPage(query, requestedLimit, nextOffset)
      issues.push(...page.issues)

      const followingOffset = page.offset + page.issues.length
      if (followingOffset >= page.total_count) return issues
      if (page.issues.length === 0 || followingOffset <= nextOffset) {
        throw new RedmineApiError(
          'Redmine pagination did not advance.',
          'invalid-response',
        )
      }
      nextOffset = followingOffset
    }
  }

  async getIssueWithJournals(
    issueId: number,
  ): Promise<RedmineApiIssueWithJournals> {
    if (!Number.isInteger(issueId) || issueId < 1) {
      throw new TypeError('issueId must be a positive integer.')
    }
    const url = new URL(`issues/${issueId}.json`, this.baseUrl)
    url.searchParams.set('include', 'journals')
    const response = parseIssueResponse(await this.requestJson(url))
    return response.issue
  }

  async getIssuesWithJournals(
    query: RedmineIssueQuery = {},
  ): Promise<RedmineApiIssueWithJournals[]> {
    const issues = await this.getIssues(query)
    return Promise.all(
      issues.map((issue) => this.getIssueWithJournals(issue.id)),
    )
  }

  private async getIssuesPage(
    query: RedmineIssueQuery,
    limit: number,
    offset: number,
  ): Promise<RedmineApiIssuesPage> {
    const url = new URL('issues.json', this.baseUrl)
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && key !== 'limit' && key !== 'offset') {
        appendQueryValue(url.searchParams, key, value)
      }
    })
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    return parseIssuesPage(await this.requestJson(url))
  }

  private readNonNegativeInteger(
    value: RedmineIssueQuery[string],
    name: string,
  ): number | undefined {
    if (value === undefined) return undefined
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isInteger(parsed) || parsed < 0 || Array.isArray(value)) {
      throw new TypeError(`${name} must be a non-negative integer.`)
    }
    return parsed
  }

  private async requestJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImplementation(url, {
        headers: { 'X-Redmine-API-Key': this.apiKey },
      })
    } catch {
      throw new RedmineApiError(
        'The Redmine instance could not be reached.',
        'network',
      )
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new RedmineApiError(
          'Redmine authentication failed. Check the API key.',
          'unauthorized',
          401,
        )
      }
      if (response.status === 403) {
        throw new RedmineApiError(
          'Redmine denied access to the requested resource.',
          'forbidden',
          403,
        )
      }
      throw new RedmineApiError(
        `Redmine request failed with HTTP status ${response.status}.`,
        'http',
        response.status,
      )
    }

    try {
      return await response.json()
    } catch {
      throw new RedmineApiError(
        'Redmine returned invalid JSON.',
        'invalid-response',
      )
    }
  }
}
