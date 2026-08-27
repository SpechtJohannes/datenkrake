import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CycleTimeResult } from './cycleTime'
import { calculateCycleTime } from './cycleTime'
import {
  calculateCycleTimeTrend,
  type CycleTimeTrendIssue,
} from './cycleTimeTrend'

vi.mock('./cycleTime', () => ({
  calculateCycleTime: vi.fn(),
}))

const DAY_MS = 24 * 60 * 60 * 1000
const mockedCalculateCycleTime = vi.mocked(calculateCycleTime)
const statusDefinitions = [
  { id: 2, name: 'Refined', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function createIssue(id: number, subject = `Issue ${id}`): CycleTimeTrendIssue {
  return {
    id,
    subject,
    status: { id: 5, name: 'Done', is_closed: true },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: '2026-01-02T00:00:00Z',
    journals: [],
  }
}

function completed(
  endedAt: string,
  durationMs: number | null,
): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt,
    durationMs,
    isRunning: false,
  }
}

function running(): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt: null,
    durationMs: DAY_MS,
    isRunning: true,
  }
}

describe('calculateCycleTimeTrend', () => {
  beforeEach(() => {
    mockedCalculateCycleTime.mockReset()
  })

  it('returns no points without completed cycle times', () => {
    expect(calculateCycleTimeTrend([], statusDefinitions)).toEqual([])
  })

  it('creates a point with issue information and duration in days', () => {
    mockedCalculateCycleTime.mockReturnValue(
      completed('2026-01-03T00:00:00Z', 2 * DAY_MS),
    )

    expect(
      calculateCycleTimeTrend(
        [createIssue(42, 'Kontrollticket')],
        statusDefinitions,
      ),
    ).toEqual([
      {
        issueId: 42,
        subject: 'Kontrollticket',
        completedAt: '2026-01-03T00:00:00Z',
        completedAtMs: Date.parse('2026-01-03T00:00:00Z'),
        durationMs: 2 * DAY_MS,
        durationDays: 2,
      },
    ])
  })

  it('sorts several points chronologically', () => {
    mockedCalculateCycleTime
      .mockReturnValueOnce(completed('2026-01-04T00:00:00Z', DAY_MS))
      .mockReturnValueOnce(completed('2026-01-02T00:00:00Z', DAY_MS))
      .mockReturnValueOnce(completed('2026-01-03T00:00:00Z', DAY_MS))

    const points = calculateCycleTimeTrend(
      [createIssue(1), createIssue(2), createIssue(3)],
      statusDefinitions,
    )

    expect(points.map((point) => point.issueId)).toEqual([2, 3, 1])
  })

  it('orders identical completion timestamps by issue ID and subject', () => {
    mockedCalculateCycleTime.mockReturnValue(
      completed('2026-01-03T00:00:00Z', DAY_MS),
    )

    const points = calculateCycleTimeTrend(
      [createIssue(3), createIssue(1, 'B'), createIssue(1, 'A')],
      statusDefinitions,
    )

    expect(points.map((point) => `${point.issueId}-${point.subject}`)).toEqual([
      '1-A',
      '1-B',
      '3-Issue 3',
    ])
  })

  it('excludes running, not-started, invalid-duration, and invalid-end results', () => {
    mockedCalculateCycleTime
      .mockReturnValueOnce(running())
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(completed('2026-01-03T00:00:00Z', null))
      .mockReturnValueOnce(completed('2026-01-03T00:00:00Z', Number.NaN))
      .mockReturnValueOnce(completed('2026-01-03T00:00:00Z', -1))
      .mockReturnValueOnce(completed('invalid', DAY_MS))
      .mockReturnValueOnce(completed('2026-01-04T00:00:00Z', DAY_MS))

    const issues = Array.from({ length: 7 }, (_, index) =>
      createIssue(index + 1),
    )
    const points = calculateCycleTimeTrend(issues, statusDefinitions)

    expect(points.map((point) => point.issueId)).toEqual([7])
  })
})
