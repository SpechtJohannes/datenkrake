import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatusHistoryIssue } from './statusHistory'
import { calculateThroughputDistribution } from './throughputDistribution'
import {
  calculateWeeklyThroughput,
  type WeeklyThroughput,
} from './weeklyThroughput'

vi.mock('./weeklyThroughput', () => ({ calculateWeeklyThroughput: vi.fn() }))

const mockedCalculateWeeklyThroughput = vi.mocked(calculateWeeklyThroughput)
const statuses = [
  { id: 2, name: 'Refined', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]
const issues: StatusHistoryIssue[] = [
  {
    status: { id: 5, name: 'Done', is_closed: true },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: '2026-01-02T00:00:00Z',
    journals: [],
  },
]

function week(isoWeek: number, completedCount: number): WeeklyThroughput {
  return {
    isoWeekYear: 2026,
    isoWeek,
    completedCount,
    weekStart: `2026-01-${String(isoWeek).padStart(2, '0')}T00:00:00.000Z`,
    weekEnd: `2026-01-${String(isoWeek + 6).padStart(2, '0')}T23:59:59.999Z`,
  }
}

describe('calculateThroughputDistribution', () => {
  beforeEach(() => mockedCalculateWeeklyThroughput.mockReset())

  it('returns a neutral metric result without completed tickets', () => {
    mockedCalculateWeeklyThroughput.mockReturnValue([])

    expect(calculateThroughputDistribution(issues, statuses)).toEqual({
      weeks: [],
      weekCount: 0,
      totalThroughput: 0,
      averageThroughput: null,
      medianThroughput: null,
    })
  })

  it('uses the central weekly throughput including zero weeks and calculates totals and average', () => {
    const weeks = [week(1, 2), week(2, 0), week(3, 4)]
    mockedCalculateWeeklyThroughput.mockReturnValue(weeks)

    const result = calculateThroughputDistribution(issues, statuses)

    expect(result.weeks).toBe(weeks)
    expect(result.weekCount).toBe(3)
    expect(result.totalThroughput).toBe(6)
    expect(result.averageThroughput).toBe(2)
    expect(mockedCalculateWeeklyThroughput).toHaveBeenCalledOnce()
    expect(mockedCalculateWeeklyThroughput).toHaveBeenCalledWith(
      issues,
      statuses,
    )
  })

  it('calculates an odd weekly median', () => {
    mockedCalculateWeeklyThroughput.mockReturnValue([
      week(1, 5),
      week(2, 1),
      week(3, 3),
    ])

    expect(
      calculateThroughputDistribution(issues, statuses).medianThroughput,
    ).toBe(3)
  })

  it('calculates an even weekly median', () => {
    mockedCalculateWeeklyThroughput.mockReturnValue([
      week(1, 1),
      week(2, 4),
      week(3, 2),
      week(4, 8),
    ])

    expect(
      calculateThroughputDistribution(issues, statuses).medianThroughput,
    ).toBe(3)
  })
})
