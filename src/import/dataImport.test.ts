import { describe, expect, it } from 'vitest'
import type { Issue } from '../data/types'
import { reconstructStatusHistory } from '../domain/statusHistory'
import { calculateCycleTime } from '../domain/cycleTime'
import { createDataExport, serializeDataExport } from '../export/dataExport'
import { DataImportError, parseDataImport } from './dataImport'

const exportTime = new Date('2026-08-27T14:00:00.000Z')
const statusDefinitions = [
  { id: 1, name: 'New', is_closed: false },
  { id: 3, name: 'In Progress', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function issue(id: number, overrides: Partial<Issue> = {}): Issue {
  return {
    id,
    subject: `Issue ${id}`,
    status: { id: 3, name: 'In Progress', is_closed: false },
    created_on: '2026-08-01T08:00:00Z',
    closed_on: null,
    journals: [],
    ...overrides,
  }
}

function validExport(issues: readonly Issue[] = [issue(42)]) {
  return createDataExport({ issues, statusDefinitions }, exportTime)
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

describe('parseDataImport version 3', () => {
  it('imports a valid minimized issue directly', () => {
    expect(parse(validExport())).toEqual({
      format: 'datenkrake',
      version: 3,
      exportedAt: '2026-08-27T14:00:00.000Z',
      statusDefinitions,
      issues: [issue(42)],
    })
  })

  it('roundtrips the complete domain data set', () => {
    const source = issue(42, {
      status: { id: 5, name: 'Done', is_closed: true },
      closed_on: '2026-08-04T12:00:00Z',
      journals: [
        {
          id: 201,
          created_on: '2026-08-02T09:00:00Z',
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
          created_on: '2026-08-03T10:00:00Z',
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

    const imported = parseDataImport(
      serializeDataExport(
        createDataExport({ issues: [source], statusDefinitions }, exportTime),
      ),
    )

    expect(imported.issues).toEqual([source])
    expect(imported.statusDefinitions).toEqual(statusDefinitions)
    expect(
      reconstructStatusHistory(
        imported.issues[0],
        imported.statusDefinitions,
      ).map(({ statusId }) => statusId),
    ).toEqual([1, 3, 5])
  })

  it('preserves status-based metrics with instance-specific status IDs', () => {
    const dynamicStatuses = [
      { id: 1, name: 'New', is_closed: false },
      { id: 20, name: 'Refined', is_closed: false },
      { id: 50, name: 'Done', is_closed: true },
    ]
    const source = issue(42, {
      status: { id: 50, name: 'Done', is_closed: true },
      closed_on: '2026-08-04T08:00:00Z',
      journals: [
        {
          id: 1,
          created_on: '2026-08-02T08:00:00Z',
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
          created_on: '2026-08-04T08:00:00Z',
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
    })
    const before = calculateCycleTime(source, dynamicStatuses)
    const imported = parseDataImport(
      serializeDataExport(
        createDataExport(
          { issues: [source], statusDefinitions: dynamicStatuses },
          exportTime,
        ),
      ),
    )

    expect(
      calculateCycleTime(imported.issues[0], imported.statusDefinitions),
    ).toEqual(before)
  })

  it('accepts null and present closing timestamps and empty data sets', () => {
    expect(parse(validExport()).issues[0].closed_on).toBeNull()
    expect(
      parse(validExport([issue(42, { closed_on: '2026-08-04T12:00:00Z' })]))
        .issues[0].closed_on,
    ).toBe('2026-08-04T12:00:00Z')
    expect(parse(validExport([])).issues).toEqual([])
  })

  it('rejects unsupported versions', () => {
    expectImportError(
      { ...validExport(), version: 4 },
      'unsupported-version',
      'version',
    )
  })

  it('rejects invalid issue structures and extra Redmine fields', () => {
    expectImportError(
      { ...validExport(), issues: [{ ...issue(42), subject: 123 }] },
      'invalid-issue',
      'issues[0]',
    )
    expectImportError(
      { ...validExport(), issues: [{ ...issue(42), description: 'text' }] },
      'invalid-issue',
      'issues[0]',
    )
  })

  it('rejects invalid journals and incomplete status changes', () => {
    expectImportError(
      {
        ...validExport(),
        issues: [
          {
            ...issue(42),
            journals: [{ id: 0, created_on: 'bad', details: [] }],
          },
        ],
      },
      'invalid-journal',
      'issues[0].journals[0]',
    )
    expectImportError(
      {
        ...validExport(),
        issues: [
          {
            ...issue(42),
            journals: [
              {
                id: 101,
                created_on: '2026-08-02T09:00:00Z',
                details: [
                  { property: 'attr', name: 'status_id', old_value: '1' },
                ],
              },
            ],
          },
        ],
      },
      'invalid-journal-detail',
      'issues[0].journals[0].details[0]',
    )
  })

  it('rejects invalid JSON without disclosing its contents', () => {
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
})

describe('parseDataImport version 2 compatibility', () => {
  it('uses the supplied legacy status catalog', () => {
    const legacyV2: Record<string, unknown> = {
      ...validExport(),
      version: 2,
    }
    delete legacyV2.statusDefinitions
    const result = parseDataImport(JSON.stringify(legacyV2), statusDefinitions)

    expect(result.version).toBe(2)
    expect(result.statusDefinitions).toEqual(statusDefinitions)
  })
})

describe('parseDataImport version 1 migration', () => {
  it('imports version 1 and immediately discards legacy Redmine data', () => {
    const legacy = {
      format: 'datenkrake',
      version: 1,
      exportedAt: '2026-08-27T14:00:00.000Z',
      issues: [
        {
          id: 42,
          project: { id: 1, name: 'Secret project' },
          tracker: { id: 2, name: 'Story' },
          status: { id: 3, name: 'In Progress', is_closed: false },
          priority: { id: 4, name: 'Normal' },
          author: { id: 5, name: 'Ada' },
          assigned_to: { id: 6, name: 'Grace' },
          subject: 'Legacy issue',
          description: 'private free text',
          custom_fields: [{ id: 7, name: 'Team', value: 'Alpha' }],
          created_on: '2026-08-01T08:00:00Z',
          updated_on: '2026-08-03T10:00:00Z',
          closed_on: null,
          journals: [
            {
              id: 101,
              user: { id: 5, name: 'Ada' },
              notes: 'private journal text',
              private_notes: true,
              created_on: '2026-08-02T09:00:00Z',
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
        },
      ],
    }

    const result = parseDataImport(JSON.stringify(legacy), statusDefinitions)

    expect(result.version).toBe(1)
    expect(result.statusDefinitions).toEqual(statusDefinitions)
    expect(result.issues).toEqual([
      issue(42, {
        subject: 'Legacy issue',
        journals: [
          {
            id: 101,
            created_on: '2026-08-02T09:00:00Z',
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
      }),
    ])
    expect(result.issues[0]).not.toHaveProperty('author')
    expect(result.issues[0]).not.toHaveProperty('description')
    expect(result.issues[0].journals[0]).not.toHaveProperty('user')
    expect(result.issues[0].journals[0]).not.toHaveProperty('notes')
  })
})
