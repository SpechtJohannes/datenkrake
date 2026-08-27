import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CycleTimeResult } from './cycleTime'
import { calculateCycleTime } from './cycleTime'
import type { StatusHistoryIssue } from './statusHistory'
import { calculateWeeklyThroughput } from './weeklyThroughput'

vi.mock('./cycleTime', () => ({
  calculateCycleTime: vi.fn(),
}))

const mockedCalculateCycleTime = vi.mocked(calculateCycleTime)
const statusDefinitions = [
  { id: 2, name: 'Refined', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function createIssue(id: number): StatusHistoryIssue {
  return {
    status: { id, name: `Status ${id}`, is_closed: false },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
  }
}

function completed(endedAt: string): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt,
    durationMs: 24 * 60 * 60 * 1000,
    isRunning: false,
  }
}

function calculateForResults(results: (CycleTimeResult | null)[]) {
  results.forEach((result) =>
    mockedCalculateCycleTime.mockReturnValueOnce(result),
  )
  return calculateWeeklyThroughput(
    results.map((_, index) => createIssue(index + 1)),
    statusDefinitions,
  )
}

describe('calculateWeeklyThroughput', () => {
  beforeEach(() => {
    mockedCalculateCycleTime.mockReset()
  })

  it('returns an empty result without completed tickets', () => {
    expect(calculateWeeklyThroughput([], statusDefinitions)).toEqual([])
  })

  it('assigns one ticket to its ISO week with UTC boundaries', () => {
    const throughput = calculateForResults([completed('2026-01-07T23:30:00Z')])

    expect(throughput).toEqual([
      {
        isoWeekYear: 2026,
        isoWeek: 2,
        completedCount: 1,
        weekStart: '2026-01-05T00:00:00.000Z',
        weekEnd: '2026-01-11T23:59:59.999Z',
      },
    ])
  })

  it('counts several tickets in the same week exactly once', () => {
    const throughput = calculateForResults([
      completed('2026-01-05T00:00:00Z'),
      completed('2026-01-07T12:00:00Z'),
      completed('2026-01-11T23:59:59Z'),
    ])

    expect(throughput).toHaveLength(1)
    expect(throughput[0].completedCount).toBe(3)
  })

  it('sorts multiple weeks and fills an empty week between them', () => {
    const throughput = calculateForResults([
      completed('2026-01-20T00:00:00Z'),
      completed('2026-01-06T00:00:00Z'),
    ])

    expect(
      throughput.map((week) => [week.isoWeek, week.completedCount]),
    ).toEqual([
      [2, 1],
      [3, 0],
      [4, 1],
    ])
  })

  it('uses the ISO week year correctly across a calendar-year boundary', () => {
    const throughput = calculateForResults([
      completed('2021-01-01T12:00:00Z'),
      completed('2021-01-04T12:00:00Z'),
    ])

    expect(throughput.map((week) => [week.isoWeekYear, week.isoWeek])).toEqual([
      [2020, 53],
      [2021, 1],
    ])
  })

  it('excludes running, not-started, and invalid completion times', () => {
    const throughput = calculateForResults([
      {
        startedAt: '2026-01-01T00:00:00Z',
        endedAt: null,
        durationMs: null,
        isRunning: true,
      },
      null,
      completed('invalid'),
      completed('2026-01-07T00:00:00Z'),
    ])

    expect(throughput).toHaveLength(1)
    expect(throughput[0].completedCount).toBe(1)
    expect(mockedCalculateCycleTime).toHaveBeenCalledTimes(4)
  })
})
