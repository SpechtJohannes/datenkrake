import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CycleTimeResult } from './cycleTime'
import { calculateCycleTime } from './cycleTime'
import { calculateCycleTimeMetrics } from './cycleTimeMetrics'
import type { StatusHistoryIssue } from './statusHistory'

vi.mock('./cycleTime', () => ({
  calculateCycleTime: vi.fn(),
}))

const mockedCalculateCycleTime = vi.mocked(calculateCycleTime)
const referenceTime = '2026-01-10T00:00:00Z'
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

function completed(durationMs: number | null): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt: '2026-01-02T00:00:00Z',
    durationMs,
    isRunning: false,
  }
}

function running(durationMs: number | null): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt: null,
    durationMs,
    isRunning: true,
  }
}

describe('calculateCycleTimeMetrics', () => {
  beforeEach(() => {
    mockedCalculateCycleTime.mockReset()
  })

  it('returns empty metrics for no issues', () => {
    expect(
      calculateCycleTimeMetrics([], statusDefinitions, referenceTime),
    ).toEqual({
      medianCompletedDurationMs: null,
      completedCount: 0,
      runningCount: 0,
    })
  })

  it('does not count cycle times that have not started', () => {
    mockedCalculateCycleTime.mockReturnValue(null)

    const metrics = calculateCycleTimeMetrics(
      [createIssue(1), createIssue(2)],
      statusDefinitions,
      referenceTime,
    )

    expect(metrics).toEqual({
      medianCompletedDurationMs: null,
      completedCount: 0,
      runningCount: 0,
    })
  })

  it('counts running cycle times without including them in the median', () => {
    mockedCalculateCycleTime
      .mockReturnValueOnce(running(100))
      .mockReturnValueOnce(running(200))

    const metrics = calculateCycleTimeMetrics(
      [createIssue(1), createIssue(2)],
      statusDefinitions,
      referenceTime,
    )

    expect(metrics).toEqual({
      medianCompletedDurationMs: null,
      completedCount: 0,
      runningCount: 2,
    })
    expect(mockedCalculateCycleTime).toHaveBeenCalledWith(
      expect.anything(),
      statusDefinitions,
      referenceTime,
    )
  })

  it('uses the duration of one completed cycle time as median', () => {
    mockedCalculateCycleTime.mockReturnValue(completed(300))

    expect(
      calculateCycleTimeMetrics(
        [createIssue(1)],
        statusDefinitions,
        referenceTime,
      ),
    ).toEqual({
      medianCompletedDurationMs: 300,
      completedCount: 1,
      runningCount: 0,
    })
  })

  it('selects the middle duration for an odd number of completed cycles', () => {
    mockedCalculateCycleTime
      .mockReturnValueOnce(completed(300))
      .mockReturnValueOnce(completed(100))
      .mockReturnValueOnce(completed(200))

    const metrics = calculateCycleTimeMetrics(
      [createIssue(1), createIssue(2), createIssue(3)],
      statusDefinitions,
    )

    expect(metrics.medianCompletedDurationMs).toBe(200)
    expect(metrics.completedCount).toBe(3)
  })

  it('averages the middle durations for an even number of completed cycles', () => {
    mockedCalculateCycleTime
      .mockReturnValueOnce(completed(400))
      .mockReturnValueOnce(completed(100))
      .mockReturnValueOnce(completed(300))
      .mockReturnValueOnce(completed(200))

    const metrics = calculateCycleTimeMetrics(
      [createIssue(1), createIssue(2), createIssue(3), createIssue(4)],
      statusDefinitions,
    )

    expect(metrics.medianCompletedDurationMs).toBe(250)
    expect(metrics.completedCount).toBe(4)
  })

  it('excludes running, not-started, and invalid durations from the median', () => {
    mockedCalculateCycleTime
      .mockReturnValueOnce(completed(100))
      .mockReturnValueOnce(running(500))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(completed(null))
      .mockReturnValueOnce(completed(-1))
      .mockReturnValueOnce(completed(300))

    const issues = Array.from({ length: 6 }, (_, index) =>
      createIssue(index + 1),
    )
    const metrics = calculateCycleTimeMetrics(
      issues,
      statusDefinitions,
      referenceTime,
    )

    expect(metrics).toEqual({
      medianCompletedDurationMs: 200,
      completedCount: 4,
      runningCount: 1,
    })
  })
})
