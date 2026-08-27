import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatusDwellTime } from './statusDwellTime'
import { calculateStatusDwellTimes } from './statusDwellTime'
import type { StatusHistoryIssue } from './statusHistory'
import {
  calculateAggregatedStatusDwellTimes,
  calculateMedianMs,
} from './aggregatedStatusDwellTimes'

vi.mock('./statusDwellTime', async (importOriginal) => {
  const original = await importOriginal<typeof import('./statusDwellTime')>()
  return { ...original, calculateStatusDwellTimes: vi.fn() }
})

const mockedCalculateStatusDwellTimes = vi.mocked(calculateStatusDwellTimes)
const DAY_MS = 24 * 60 * 60 * 1000
const statuses = [
  { id: 1, name: 'New', is_closed: false },
  { id: 2, name: 'Refined', is_closed: false },
  { id: 3, name: 'In Progress', is_closed: false },
]

function issue(): StatusHistoryIssue {
  return {
    status: { id: 1, name: 'New', is_closed: false },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
  }
}

function dwell(
  statusId: number,
  statusName: string | null,
  visitDurationsMs: number[],
  ongoingDurationMs: number | null = null,
): StatusDwellTime {
  return {
    statusId,
    statusName,
    completedDurationMs: 0,
    ongoingDurationMs,
    totalDurationMs: 0,
    visitCount: visitDurationsMs.length,
    isCurrent: ongoingDurationMs !== null,
    visitDurationsMs,
  }
}

function calculate(results: readonly StatusDwellTime[][]) {
  results.forEach((result) =>
    mockedCalculateStatusDwellTimes.mockReturnValueOnce(result),
  )
  return calculateAggregatedStatusDwellTimes(
    results.map(() => issue()),
    statuses,
    '2026-01-10T00:00:00Z',
  )
}

describe('calculateAggregatedStatusDwellTimes', () => {
  beforeEach(() => mockedCalculateStatusDwellTimes.mockReset())

  it('assigns and aggregates valid visits with odd median and average', () => {
    const result = calculate([
      [dwell(2, 'Refined', [DAY_MS, 3 * DAY_MS])],
      [dwell(2, 'Refined', [2 * DAY_MS])],
    ])

    expect(result).toEqual([
      {
        statusId: 2,
        statusName: 'Refined',
        dwellTimeCount: 3,
        medianDurationMs: 2 * DAY_MS,
        averageDurationMs: 2 * DAY_MS,
      },
    ])
  })

  it('calculates the median correctly for even and odd counts', () => {
    expect(calculateMedianMs([3, 1, 2])).toBe(2)
    expect(calculateMedianMs([4, 1, 2, 3])).toBe(2.5)
  })

  it('excludes invalid durations', () => {
    const [result] = calculate([
      [dwell(1, 'New', [DAY_MS, -1, Number.NaN, Number.POSITIVE_INFINITY])],
    ])

    expect(result.dwellTimeCount).toBe(1)
    expect(result.medianDurationMs).toBe(DAY_MS)
    expect(result.averageDurationMs).toBe(DAY_MS)
  })

  it('separates statuses and follows catalog process order', () => {
    const result = calculate([
      [dwell(3, 'In Progress', [DAY_MS]), dwell(1, 'New', [2 * DAY_MS])],
      [dwell(2, 'Refined', [3 * DAY_MS])],
    ])

    expect(result.map((status) => status.statusId)).toEqual([1, 2, 3])
  })

  it('includes a running visit supplied by the central dwell-time logic', () => {
    const [result] = calculate([
      [dwell(3, 'In Progress', [4 * DAY_MS], 4 * DAY_MS)],
    ])

    expect(result.dwellTimeCount).toBe(1)
    expect(result.medianDurationMs).toBe(4 * DAY_MS)
    expect(mockedCalculateStatusDwellTimes).toHaveBeenCalledWith(
      expect.anything(),
      '2026-01-10T00:00:00Z',
      statuses,
    )
  })
})
