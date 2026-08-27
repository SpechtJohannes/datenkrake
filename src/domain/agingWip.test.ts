import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CycleTimeResult } from './cycleTime'
import { calculateCycleTime } from './cycleTime'
import { calculateAgingWip, type AgingWipIssue } from './agingWip'

vi.mock('./cycleTime', () => ({ calculateCycleTime: vi.fn() }))

const mockedCalculateCycleTime = vi.mocked(calculateCycleTime)
const DAY_MS = 24 * 60 * 60 * 1000
const statuses = [
  { id: 2, name: 'Refined', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function issue(id: number): AgingWipIssue {
  return {
    id,
    subject: `Ticket ${id}`,
    status: { id: 3, name: 'In Progress', is_closed: false },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
  }
}

function running(ageDays: number): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt: null,
    durationMs: ageDays * DAY_MS,
    isRunning: true,
  }
}

function calculate(results: readonly (CycleTimeResult | null)[]) {
  results.forEach((result) =>
    mockedCalculateCycleTime.mockReturnValueOnce(result),
  )
  return calculateAgingWip(
    results.map((_, index) => issue(index + 1)),
    statuses,
    '2026-01-10T00:00:00Z',
  )
}

describe('calculateAgingWip', () => {
  beforeEach(() => mockedCalculateCycleTime.mockReset())

  it('includes a running ticket and uses its calculated Cycle Time age', () => {
    expect(calculate([running(2.5)])).toEqual([
      {
        issueId: 1,
        subject: 'Ticket 1',
        currentStatus: 'In Progress',
        startedAt: '2026-01-01T00:00:00Z',
        ageMs: 2.5 * DAY_MS,
        ageDays: 2.5,
      },
    ])
  })

  it('excludes completed tickets and tickets without a Cycle Time start', () => {
    const completed: CycleTimeResult = {
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-03T00:00:00Z',
      durationMs: 2 * DAY_MS,
      isRunning: false,
    }

    expect(calculate([completed, null])).toEqual([])
    expect(mockedCalculateCycleTime).toHaveBeenCalledTimes(2)
  })

  it('sorts several running tickets by age descending', () => {
    const items = calculate([running(2), running(8), running(4), running(8)])

    expect(items.map((item) => [item.issueId, item.ageDays])).toEqual([
      [2, 8],
      [4, 8],
      [3, 4],
      [1, 2],
    ])
  })

  it('excludes invalid running durations defensively', () => {
    expect(
      calculate([
        { ...running(1), durationMs: null },
        { ...running(1), durationMs: Number.NaN },
        { ...running(1), durationMs: -1 },
      ]),
    ).toEqual([])
  })
})
