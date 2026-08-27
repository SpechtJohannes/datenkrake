import { describe, expect, it } from 'vitest'
import type { RedmineJournalDetail, StatusDefinition } from '../data/issues'
import type { StatusHistoryIssue } from './statusHistory'
import { calculateCycleTime } from './cycleTime'

const DAY_MS = 24 * 60 * 60 * 1000

const statusDefinitions: readonly StatusDefinition[] = [
  { id: 1, name: 'New', is_closed: false },
  { id: 2, name: 'Refined', is_closed: false },
  { id: 3, name: 'In Progress', is_closed: false },
  { id: 4, name: 'Review', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function createIssue(
  overrides: Partial<StatusHistoryIssue> = {},
): StatusHistoryIssue {
  return {
    status: { id: 1, name: 'New', is_closed: false },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
    ...overrides,
  }
}

function createJournal(
  id: number,
  day: number,
  oldStatusId: number,
  newStatusId: number,
) {
  const detail: RedmineJournalDetail = {
    property: 'attr',
    name: 'status_id',
    old_value: String(oldStatusId),
    new_value: String(newStatusId),
  }

  return {
    id,
    created_on: `2026-01-${String(day).padStart(2, '0')}T00:00:00Z`,
    details: [detail],
  }
}

describe('calculateCycleTime', () => {
  it('returns null when the issue never reaches Refined', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 3, name: 'In Progress', is_closed: false },
        journals: [createJournal(1, 2, 1, 3)],
      }),
      statusDefinitions,
    )

    expect(result).toBeNull()
  })

  it('starts at issue creation when the issue starts in Refined', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 2, name: 'Refined', is_closed: false },
      }),
      statusDefinitions,
      '2026-01-03T00:00:00Z',
    )

    expect(result).toEqual({
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: null,
      durationMs: 2 * DAY_MS,
      isRunning: true,
    })
  })

  it('calculates the normal path from first Refined to first Done', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-01-04T00:00:00Z',
        journals: [
          createJournal(1, 2, 1, 2),
          createJournal(2, 3, 2, 3),
          createJournal(3, 4, 3, 5),
        ],
      }),
      statusDefinitions,
    )

    expect(result).toEqual({
      startedAt: '2026-01-02T00:00:00Z',
      endedAt: '2026-01-04T00:00:00Z',
      durationMs: 2 * DAY_MS,
      isRunning: false,
    })
  })

  it('does not reset the start after returning to Refined', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-01-06T00:00:00Z',
        journals: [
          createJournal(1, 2, 1, 2),
          createJournal(2, 3, 2, 3),
          createJournal(3, 4, 3, 2),
          createJournal(4, 5, 2, 3),
          createJournal(5, 6, 3, 5),
        ],
      }),
      statusDefinitions,
    )

    expect(result).toMatchObject({
      startedAt: '2026-01-02T00:00:00Z',
      endedAt: '2026-01-06T00:00:00Z',
      durationMs: 4 * DAY_MS,
    })
  })

  it('uses the first Done entry after the start even if Done is entered again', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-01-06T00:00:00Z',
        journals: [
          createJournal(1, 2, 1, 2),
          createJournal(2, 3, 2, 5),
          createJournal(3, 4, 5, 4),
          createJournal(4, 6, 4, 5),
        ],
      }),
      statusDefinitions,
      '2026-02-01T00:00:00Z',
    )

    expect(result).toEqual({
      startedAt: '2026-01-02T00:00:00Z',
      endedAt: '2026-01-03T00:00:00Z',
      durationMs: DAY_MS,
      isRunning: false,
    })
  })

  it('allows an unknown status within the cycle time', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-01-04T00:00:00Z',
        journals: [
          createJournal(1, 2, 1, 2),
          createJournal(2, 3, 2, 6),
          createJournal(3, 4, 6, 5),
        ],
      }),
      statusDefinitions,
    )

    expect(result?.durationMs).toBe(2 * DAY_MS)
  })

  it('calculates a running cycle against an explicit reference time', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 3, name: 'In Progress', is_closed: false },
        journals: [createJournal(1, 2, 1, 2), createJournal(2, 3, 2, 3)],
      }),
      statusDefinitions,
      '2026-01-05T00:00:00Z',
    )

    expect(result).toEqual({
      startedAt: '2026-01-02T00:00:00Z',
      endedAt: null,
      durationMs: 3 * DAY_MS,
      isRunning: true,
    })
  })

  it('does not invent a duration for a running cycle without a reference', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 2, name: 'Refined', is_closed: false },
      }),
      statusDefinitions,
    )

    expect(result).toMatchObject({
      endedAt: null,
      durationMs: null,
      isRunning: true,
    })
  })

  it('does not change a completed cycle when a reference is provided', () => {
    const issue = createIssue({
      status: { id: 5, name: 'Done', is_closed: true },
      closed_on: '2026-01-03T00:00:00Z',
      journals: [createJournal(1, 2, 1, 2), createJournal(2, 3, 2, 5)],
    })

    const withoutReference = calculateCycleTime(issue, statusDefinitions)
    const withReference = calculateCycleTime(
      issue,
      statusDefinitions,
      '2026-02-01T00:00:00Z',
    )

    expect(withReference).toEqual(withoutReference)
  })

  it('returns no negative duration for an implausible reference time', () => {
    const result = calculateCycleTime(
      createIssue({
        status: { id: 2, name: 'Refined', is_closed: false },
      }),
      statusDefinitions,
      '2025-12-31T00:00:00Z',
    )

    expect(result).toMatchObject({ durationMs: null, isRunning: true })
  })

  it('derives start and end IDs from names instead of fixed IDs', () => {
    const customDefinitions: readonly StatusDefinition[] = [
      { id: 20, name: 'Refined', is_closed: false },
      { id: 50, name: 'Done', is_closed: true },
    ]
    const result = calculateCycleTime(
      createIssue({
        status: { id: 50, name: 'Done', is_closed: true },
        closed_on: '2026-01-03T00:00:00Z',
        journals: [createJournal(1, 3, 20, 50)],
        created_on: '2026-01-01T00:00:00Z',
      }),
      customDefinitions,
    )

    expect(result).toMatchObject({
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-03T00:00:00Z',
    })
  })
})
