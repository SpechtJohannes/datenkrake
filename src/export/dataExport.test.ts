import { describe, expect, it } from 'vitest'
import type { Issue } from '../data/types'
import {
  createDataExport,
  createDataExportFileName,
  DATA_EXPORT_FORMAT,
  DATA_EXPORT_VERSION,
  serializeDataExport,
} from './dataExport'

const exportTime = new Date('2026-08-27T14:00:00.000Z')

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

describe('createDataExport', () => {
  it('exports format version 2 with the controlled timestamp', () => {
    const result = createDataExport([issue(42)], exportTime)

    expect(result).toMatchObject({
      format: DATA_EXPORT_FORMAT,
      version: DATA_EXPORT_VERSION,
      exportedAt: '2026-08-27T14:00:00.000Z',
    })
    expect(result.version).toBe(2)
    expect(result.issues).toHaveLength(1)
  })

  it('exports only domain fields and complete status changes', () => {
    const source = Object.assign(
      issue(42, {
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
              {
                property: 'attr',
                name: 'done_ratio',
                old_value: '0',
                new_value: '20',
              },
            ],
          },
        ],
      }),
      {
        author: { id: 5, name: 'Ada' },
        assigned_to: { id: 6, name: 'Grace' },
        description: 'private free text',
        custom_fields: [{ id: 7, name: 'Team', value: 'Alpha' }],
      },
    )

    const exported = createDataExport([source], exportTime)
    const serialized = serializeDataExport(exported)

    expect(exported.issues[0]).toEqual(
      issue(42, {
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
    )
    expect(serialized).not.toContain('Ada')
    expect(serialized).not.toContain('Grace')
    expect(serialized).not.toContain('private free text')
    expect(serialized).not.toContain('custom_fields')
  })

  it('preserves order, null closing timestamps, and empty data sets', () => {
    expect(
      createDataExport([issue(3), issue(1), issue(2)], exportTime).issues.map(
        ({ id }) => id,
      ),
    ).toEqual([3, 1, 2])
    expect(
      createDataExport([issue(42)], exportTime).issues[0].closed_on,
    ).toBeNull()
    expect(createDataExport([], exportTime).issues).toEqual([])
  })

  it('creates detached copies of nested domain data', () => {
    const source = issue(42, {
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
    })
    const [exported] = createDataExport([source], exportTime).issues

    expect(exported).toEqual(source)
    expect(exported).not.toBe(source)
    expect(exported.status).not.toBe(source.status)
    expect(exported.journals).not.toBe(source.journals)
    expect(exported.journals[0].details).not.toBe(source.journals[0].details)
  })
})

describe('serializeDataExport', () => {
  it('serializes the export as valid JSON', () => {
    const dataExport = createDataExport([issue(42)], exportTime)
    expect(JSON.parse(serializeDataExport(dataExport))).toEqual(dataExport)
  })
})

describe('createDataExportFileName', () => {
  it('creates a UTC date-based filename without project information', () => {
    expect(createDataExportFileName(exportTime)).toBe(
      'datenkrake_2026_08_27.json',
    )
  })
})
