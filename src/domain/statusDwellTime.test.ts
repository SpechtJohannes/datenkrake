import { describe, expect, it } from 'vitest'
import type { RedmineJournalDetail } from '../data/issues'
import type { StatusHistoryIssue } from './statusHistory'
import { calculateStatusDwellTimes, formatDurationMs } from './statusDwellTime'

const DAY_MS = 24 * 60 * 60 * 1000

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
  createdOn: string,
  details: readonly Partial<RedmineJournalDetail>[],
) {
  return { id, created_on: createdOn, details }
}

function statusChange(oldStatusId: number, newStatusId: number) {
  return {
    property: 'attr',
    name: 'status_id',
    old_value: String(oldStatusId),
    new_value: String(newStatusId),
  }
}

describe('calculateStatusDwellTimes', () => {
  it('calculates the ongoing dwell time for an issue without status changes', () => {
    const dwellTimes = calculateStatusDwellTimes(
      createIssue(),
      '2026-01-03T00:00:00Z',
    )

    expect(dwellTimes).toEqual([
      {
        statusId: 1,
        statusName: 'New',
        completedDurationMs: 0,
        ongoingDurationMs: 2 * DAY_MS,
        totalDurationMs: 2 * DAY_MS,
        visitCount: 1,
        isCurrent: true,
      },
    ])
  })

  it('aggregates repeated visits and keeps first-appearance order', () => {
    const dwellTimes = calculateStatusDwellTimes(
      createIssue({
        status: { id: 3, name: 'Review', is_closed: false },
        journals: [
          createJournal(1, '2026-01-02T00:00:00Z', [statusChange(1, 2)]),
          createJournal(2, '2026-01-03T00:00:00Z', [statusChange(2, 1)]),
          createJournal(3, '2026-01-04T00:00:00Z', [statusChange(1, 3)]),
        ],
      }),
      '2026-01-05T00:00:00Z',
    )

    expect(dwellTimes.map((dwellTime) => dwellTime.statusId)).toEqual([1, 2, 3])
    expect(dwellTimes[0]).toEqual({
      statusId: 1,
      statusName: null,
      completedDurationMs: 2 * DAY_MS,
      ongoingDurationMs: null,
      totalDurationMs: 2 * DAY_MS,
      visitCount: 2,
      isCurrent: false,
    })
    expect(dwellTimes[1]).toMatchObject({
      completedDurationMs: DAY_MS,
      visitCount: 1,
      isCurrent: false,
    })
    expect(dwellTimes[2]).toMatchObject({
      statusName: 'Review',
      completedDurationMs: 0,
      ongoingDurationMs: DAY_MS,
      totalDurationMs: DAY_MS,
      visitCount: 1,
      isCurrent: true,
    })
  })

  it('does not use an implicit clock when no reference time is provided', () => {
    const [dwellTime] = calculateStatusDwellTimes(createIssue())

    expect(dwellTime.ongoingDurationMs).toBeNull()
    expect(dwellTime.totalDurationMs).toBe(0)
  })

  it('uses the closed phase duration without adding time after closed_on', () => {
    const dwellTimes = calculateStatusDwellTimes(
      createIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-01-03T00:00:00Z',
        journals: [
          createJournal(1, '2026-01-02T00:00:00Z', [statusChange(1, 5)]),
        ],
      }),
      '2026-02-01T00:00:00Z',
    )

    expect(dwellTimes.at(-1)).toEqual({
      statusId: 5,
      statusName: 'Done',
      completedDurationMs: DAY_MS,
      ongoingDurationMs: null,
      totalDurationMs: DAY_MS,
      visitCount: 1,
      isCurrent: true,
    })
  })

  it('keeps an unknown historical status name as null', () => {
    const dwellTimes = calculateStatusDwellTimes(
      createIssue({
        status: { id: 2, name: 'In Progress', is_closed: false },
        journals: [
          createJournal(1, '2026-01-02T00:00:00Z', [statusChange(1, 2)]),
        ],
      }),
    )

    expect(dwellTimes[0]).toMatchObject({ statusId: 1, statusName: null })
    expect(dwellTimes[1]).toMatchObject({
      statusId: 2,
      statusName: 'In Progress',
    })
  })

  it('preserves zero duration for changes at the same timestamp', () => {
    const dwellTimes = calculateStatusDwellTimes(
      createIssue({
        status: { id: 3, name: 'Review', is_closed: false },
        journals: [
          createJournal(1, '2026-01-01T00:00:00Z', [statusChange(1, 2)]),
          createJournal(2, '2026-01-01T00:00:00Z', [statusChange(2, 3)]),
        ],
      }),
      '2026-01-01T00:00:00Z',
    )

    expect(dwellTimes.map((dwellTime) => dwellTime.totalDurationMs)).toEqual([
      0, 0, 0,
    ])
  })

  it('never returns a negative ongoing duration', () => {
    const [dwellTime] = calculateStatusDwellTimes(
      createIssue(),
      '2025-12-31T00:00:00Z',
    )

    expect(dwellTime.ongoingDurationMs).toBe(0)
    expect(dwellTime.totalDurationMs).toBe(0)
  })

  it('formats a duration independently from the calculation', () => {
    expect(formatDurationMs(2 * DAY_MS + 4 * 60 * 60 * 1000)).toBe('2d 4h')
    expect(formatDurationMs(-1)).toBe('0m')
  })
})
