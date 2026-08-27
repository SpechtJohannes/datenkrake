import { describe, expect, it } from 'vitest'
import type { RedmineIssue } from '../data/types'
import {
  createDataExport,
  createDataExportFileName,
  DATA_EXPORT_FORMAT,
  DATA_EXPORT_VERSION,
  serializeDataExport,
} from './dataExport'

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

describe('createDataExport', () => {
  it('exports one issue with format, version, and controlled timestamp', () => {
    const result = createDataExport([issue(42)], exportTime)

    expect(result).toMatchObject({
      format: DATA_EXPORT_FORMAT,
      version: DATA_EXPORT_VERSION,
      exportedAt: '2026-08-27T14:00:00.000Z',
    })
    expect(result.format).toBe('datenkrake')
    expect(result.version).toBe(1)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toEqual(issue(42))
  })

  it('preserves the order of multiple issues', () => {
    const result = createDataExport([issue(3), issue(1), issue(2)], exportTime)

    expect(result.issues.map(({ id }) => id)).toEqual([3, 1, 2])
  })

  it('exports an empty data set', () => {
    expect(createDataExport([], exportTime).issues).toEqual([])
  })

  it('preserves journals and every journal detail in order', () => {
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
        {
          id: 102,
          user: { id: 6, name: 'Grace' },
          notes: 'Reviewed',
          created_on: '2026-08-03T10:00:00Z',
          private_notes: true,
          details: [],
        },
      ],
    })

    const [exportedIssue] = createDataExport([source], exportTime).issues

    expect(exportedIssue.journals).toEqual(source.journals)
    expect(exportedIssue.journals.map(({ id }) => id)).toEqual([101, 102])
    expect(exportedIssue.journals[0].details.map(({ name }) => name)).toEqual([
      'status_id',
      'done_ratio',
    ])
    expect(exportedIssue.journals).not.toBe(source.journals)
    expect(exportedIssue.journals[0].details).not.toBe(
      source.journals[0].details,
    )
  })

  it('preserves an open issue without a closing timestamp', () => {
    const [exportedIssue] = createDataExport([issue(42)], exportTime).issues

    expect(exportedIssue.status.is_closed).toBe(false)
    expect(exportedIssue.closed_on).toBeNull()
  })

  it('preserves optional and null values without inventing data', () => {
    const source = issue(42, {
      assigned_to: undefined,
      category: undefined,
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
            {
              property: 'attr',
              name: 'assigned_to_id',
              old_value: null,
              new_value: undefined,
            },
          ],
        },
      ],
    })

    const [exportedIssue] = createDataExport([source], exportTime).issues

    expect(exportedIssue.assigned_to).toBeUndefined()
    expect(exportedIssue.category).toBeUndefined()
    expect(exportedIssue.start_date).toBeNull()
    expect(exportedIssue.due_date).toBeUndefined()
    expect(exportedIssue.total_estimated_hours).toBeNull()
    expect(exportedIssue.journals[0].details[0].old_value).toBeNull()
    expect(exportedIssue.journals[0].details[0].new_value).toBeUndefined()
  })

  it('copies only fields defined by the internal model', () => {
    const source = Object.assign(issue(42), {
      apiKey: 'must-not-be-exported',
      redmineBaseUrl: 'https://redmine.example.test',
    })

    const result = createDataExport([source], exportTime)
    const serialized = serializeDataExport(result)

    expect(serialized).not.toContain('must-not-be-exported')
    expect(serialized).not.toContain('redmine.example.test')
  })
})

describe('serializeDataExport', () => {
  it('serializes the export as valid JSON', () => {
    const dataExport = createDataExport([issue(42)], exportTime)

    expect(JSON.parse(serializeDataExport(dataExport))).toEqual(dataExport)
  })

  it('roundtrips a realistic internal data set without losing domain data', () => {
    const source = issue(42, {
      assigned_to: { id: 6, name: 'Grace' },
      status: { id: 5, name: 'Done', is_closed: true },
      done_ratio: 100,
      estimated_hours: 8,
      closed_on: '2026-08-04T12:00:00Z',
      custom_fields: [{ id: 7, name: 'Team', value: 'Alpha' }],
      journals: [
        {
          id: 201,
          user: { id: 5, name: 'Ada' },
          notes: 'Completed',
          created_on: '2026-08-04T12:00:00Z',
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
    const dataExport = createDataExport([source], exportTime)

    const parsed: unknown = JSON.parse(serializeDataExport(dataExport))

    expect(parsed).toEqual(dataExport)
    expect(parsed).toMatchObject({ issues: [source] })
  })
})

describe('createDataExportFileName', () => {
  it('creates a UTC date-based filename without project information', () => {
    expect(createDataExportFileName(exportTime)).toBe(
      'datenkrake_2026_08_27.json',
    )
  })
})
