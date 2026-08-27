import { describe, expect, it } from 'vitest'
import type { RedmineIssue } from '../data/types'
import { reconstructStatusHistory } from '../domain/statusHistory'
import { createDataExport, serializeDataExport } from '../export/dataExport'
import { DataImportError, parseDataImport } from './dataImport'

const exportTime = new Date('2026-08-27T14:00:00.000Z')

function issue(
  id: number,
  overrides: Partial<RedmineIssue> = {},
): RedmineIssue {
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
    closed_on: null,
    journals: [],
    ...overrides,
  }
}

function validExport(issues: readonly RedmineIssue[] = [issue(42)]) {
  return createDataExport(issues, exportTime)
}

function withoutField(value: object, key: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...value }
  delete copy[key]
  return copy
}

function parse(value: unknown) {
  return parseDataImport(JSON.stringify(value))
}

function expectImportError(
  value: unknown,
  kind: DataImportError['kind'],
  path?: string,
): void {
  try {
    parse(value)
    throw new Error('Expected the import to fail.')
  } catch (error) {
    expect(error).toBeInstanceOf(DataImportError)
    expect(error).toMatchObject({
      kind,
      ...(path === undefined ? {} : { path }),
    })
  }
}

describe('parseDataImport', () => {
  it('imports one valid issue and its metadata', () => {
    const result = parse(validExport())

    expect(result).toEqual({
      format: 'datenkrake',
      version: 1,
      exportedAt: '2026-08-27T14:00:00.000Z',
      issues: [issue(42)],
    })
  })

  it('imports multiple issues in their original order', () => {
    const result = parse(validExport([issue(3), issue(1), issue(2)]))

    expect(result.issues.map(({ id }) => id)).toEqual([3, 1, 2])
  })

  it('accepts an empty issue data set', () => {
    expect(parse(validExport([])).issues).toEqual([])
  })

  it('imports journals and journal details without losing their order', () => {
    const source = issue(42, {
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
      ],
    })

    const [imported] = parse(validExport([source])).issues

    expect(imported.journals).toEqual(source.journals)
    expect(imported.journals[0].details.map(({ name }) => name)).toEqual([
      'status_id',
      'done_ratio',
    ])
  })

  it('accepts permitted optional and null values', () => {
    const source = issue(42, {
      assigned_to: undefined,
      start_date: null,
      due_date: undefined,
      total_estimated_hours: null,
      journals: [
        {
          id: 101,
          user: { id: 5, name: 'Ada' },
          notes: '',
          created_on: '2026-08-02T09:00:00Z',
          private_notes: false,
          details: [
            { property: 'attr', name: 'assigned_to_id', old_value: null },
          ],
        },
      ],
    })

    const [imported] = parse(validExport([source])).issues

    expect(imported.assigned_to).toBeUndefined()
    expect(imported.start_date).toBeNull()
    expect(imported.due_date).toBeUndefined()
    expect(imported.total_estimated_hours).toBeNull()
    expect(imported.journals[0].details[0].old_value).toBeNull()
    expect(imported.journals[0].details[0].new_value).toBeUndefined()
  })

  it('rejects invalid JSON without including its contents in the error', () => {
    const content = '{"apiKey":"secret-value"'

    const error = (() => {
      try {
        parseDataImport(content)
      } catch (reason) {
        return reason
      }
    })()

    expect(error).toMatchObject({ kind: 'invalid-json' })
    expect(String(error)).not.toContain('secret-value')
  })

  it('rejects a missing format identifier', () => {
    expectImportError(withoutField(validExport(), 'format'), 'missing-format')
  })

  it('rejects a foreign format identifier', () => {
    expectImportError(
      { ...validExport(), format: 'other-app' },
      'invalid-format',
      'format',
    )
  })

  it('rejects a missing version', () => {
    expectImportError(withoutField(validExport(), 'version'), 'missing-version')
  })

  it('rejects an unsupported version', () => {
    expectImportError(
      { ...validExport(), version: 2 },
      'unsupported-version',
      'version',
    )
  })

  it('rejects a missing export timestamp', () => {
    expectImportError(
      withoutField(validExport(), 'exportedAt'),
      'missing-exported-at',
    )
  })

  it('rejects an invalid export timestamp', () => {
    expectImportError(
      { ...validExport(), exportedAt: 'not-a-timestamp' },
      'invalid-exported-at',
      'exportedAt',
    )
  })

  it('rejects missing issues', () => {
    expectImportError(withoutField(validExport(), 'issues'), 'missing-issues')
  })

  it('rejects an invalid issue and reports its path', () => {
    expectImportError(
      { ...validExport(), issues: [{ ...issue(42), subject: 123 }] },
      'invalid-issue',
      'issues[0]',
    )
  })

  it('rejects an invalid journal and reports its path', () => {
    const invalid = issue(42, {
      journals: [
        {
          id: 0,
          user: { id: 5, name: 'Ada' },
          notes: '',
          created_on: '2026-08-02T09:00:00Z',
          private_notes: false,
          details: [],
        },
      ],
    })
    expectImportError(
      { ...validExport(), issues: [invalid] },
      'invalid-journal',
      'issues[0].journals[0]',
    )
  })

  it('rejects an invalid journal detail and reports its path', () => {
    const invalid = issue(42, {
      journals: [
        {
          id: 101,
          user: { id: 5, name: 'Ada' },
          notes: '',
          created_on: '2026-08-02T09:00:00Z',
          private_notes: false,
          details: [
            { property: 'attr', name: 'status_id', old_value: 1 } as never,
          ],
        },
      ],
    })
    expectImportError(
      { ...validExport(), issues: [invalid] },
      'invalid-journal-detail',
      'issues[0].journals[0].details[0]',
    )
  })
})

describe('data export and import integration', () => {
  const completedIssue = issue(42, {
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

  it('roundtrips internal issues through export, JSON, and import', () => {
    const json = serializeDataExport(
      createDataExport([completedIssue], exportTime),
    )

    expect(parseDataImport(json).issues).toEqual([completedIssue])
  })

  it('feeds roundtripped issues directly into existing domain logic', () => {
    const json = serializeDataExport(
      createDataExport([completedIssue], exportTime),
    )
    const [imported] = parseDataImport(json).issues

    const history = reconstructStatusHistory(imported, [
      { id: 1, name: 'New', is_closed: false },
      { id: 3, name: 'In Progress', is_closed: false },
      { id: 5, name: 'Done', is_closed: true },
    ])

    expect(history.map(({ statusId }) => statusId)).toEqual([1, 3, 5])
    expect(history.at(-1)?.endedAt).toBe('2026-08-04T12:00:00Z')
  })
})
