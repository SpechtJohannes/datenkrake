import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CycleTimeResult } from './cycleTime'
import { calculateCycleTime } from './cycleTime'
import {
  calculateCurrentWipByStatus,
  type CurrentWipIssue,
} from './currentWipByStatus'

vi.mock('./cycleTime', () => ({ calculateCycleTime: vi.fn() }))
const mockedCalculateCycleTime = vi.mocked(calculateCycleTime)
const statuses = [
  { id: 2, name: 'Refined', is_closed: false },
  { id: 3, name: 'In Progress', is_closed: false },
  { id: 4, name: 'Review', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function issue(statusId: number, statusName: string): CurrentWipIssue {
  return {
    status: { id: statusId, name: statusName, is_closed: false },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
  }
}

const running: CycleTimeResult = {
  startedAt: '2026-01-02T00:00:00Z',
  endedAt: null,
  durationMs: 2 * 24 * 60 * 60 * 1000,
  isRunning: true,
}

function calculate(
  issues: readonly CurrentWipIssue[],
  results: readonly (CycleTimeResult | null)[],
) {
  results.forEach((result) =>
    mockedCalculateCycleTime.mockReturnValueOnce(result),
  )
  return calculateCurrentWipByStatus(issues, statuses, '2026-01-04T00:00:00Z')
}

describe('calculateCurrentWipByStatus', () => {
  beforeEach(() => mockedCalculateCycleTime.mockReset())

  it('assigns a running ticket to its current status', () => {
    expect(calculate([issue(3, 'In Progress')], [running])).toEqual([
      { statusId: 3, statusName: 'In Progress', issueCount: 1 },
    ])
  })

  it('aggregates tickets in the same and different statuses and preserves the total WIP', () => {
    const distribution = calculate(
      [issue(3, 'In Progress'), issue(3, 'In Progress'), issue(4, 'Review')],
      [running, running, running],
    )

    expect(distribution).toEqual([
      { statusId: 3, statusName: 'In Progress', issueCount: 2 },
      { statusId: 4, statusName: 'Review', issueCount: 1 },
    ])
    expect(
      distribution.reduce((sum, status) => sum + status.issueCount, 0),
    ).toBe(3)
  })

  it('excludes completed and not-started tickets', () => {
    const completed: CycleTimeResult = {
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-03T00:00:00Z',
      durationMs: 2,
      isRunning: false,
    }

    expect(
      calculate([issue(3, 'In Progress'), issue(5, 'Done')], [null, completed]),
    ).toEqual([])
  })

  it('uses process order and places unknown statuses deterministically last', () => {
    const distribution = calculate(
      [issue(4, 'Review'), issue(9, 'External'), issue(2, 'Refined')],
      [running, running, running],
    )

    expect(distribution.map((status) => status.statusId)).toEqual([2, 4, 9])
  })
})
