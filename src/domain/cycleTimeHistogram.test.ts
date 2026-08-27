import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CycleTimeResult } from './cycleTime'
import { calculateCycleTime } from './cycleTime'
import { calculateCycleTimeHistogram } from './cycleTimeHistogram'
import type { StatusHistoryIssue } from './statusHistory'

vi.mock('./cycleTime', () => ({
  calculateCycleTime: vi.fn(),
}))

const DAY_MS = 24 * 60 * 60 * 1000
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

function completed(durationMs: number | null): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt: '2026-01-02T00:00:00Z',
    durationMs,
    isRunning: false,
  }
}

function running(durationMs: number): CycleTimeResult {
  return {
    startedAt: '2026-01-01T00:00:00Z',
    endedAt: null,
    durationMs,
    isRunning: true,
  }
}

function calculateForDurations(results: (CycleTimeResult | null)[]) {
  results.forEach((result) =>
    mockedCalculateCycleTime.mockReturnValueOnce(result),
  )
  return calculateCycleTimeHistogram(
    results.map((_, index) => createIssue(index + 1)),
    statusDefinitions,
    '2026-01-10T00:00:00Z',
  )
}

describe('calculateCycleTimeHistogram', () => {
  beforeEach(() => {
    mockedCalculateCycleTime.mockReset()
  })

  it('returns an empty histogram without completed cycle times', () => {
    expect(calculateCycleTimeHistogram([], statusDefinitions)).toEqual({
      buckets: [],
      minDurationMs: null,
      maxDurationMs: null,
      validCycleTimeCount: 0,
    })
  })

  it('creates one bucket for one completed cycle time', () => {
    const histogram = calculateForDurations([completed(2 * DAY_MS)])

    expect(histogram).toEqual({
      buckets: [{ lowerBoundDays: 2, upperBoundDays: 2, count: 1 }],
      minDurationMs: 2 * DAY_MS,
      maxDurationMs: 2 * DAY_MS,
      validCycleTimeCount: 1,
    })
  })

  it('creates automatic buckets for several different durations', () => {
    const histogram = calculateForDurations([
      completed(DAY_MS),
      completed(2 * DAY_MS),
      completed(3 * DAY_MS),
      completed(4 * DAY_MS),
    ])

    expect(histogram.buckets).toEqual([
      { lowerBoundDays: 1, upperBoundDays: 2, count: 1 },
      { lowerBoundDays: 2, upperBoundDays: 3, count: 1 },
      { lowerBoundDays: 3, upperBoundDays: 4, count: 2 },
    ])
  })

  it('puts identical durations into one bucket', () => {
    const histogram = calculateForDurations([
      completed(2 * DAY_MS),
      completed(2 * DAY_MS),
      completed(2 * DAY_MS),
    ])

    expect(histogram.buckets).toEqual([
      { lowerBoundDays: 2, upperBoundDays: 2, count: 3 },
    ])
  })

  it('assigns every duration once and includes the maximum in the last bucket', () => {
    const histogram = calculateForDurations([
      completed(DAY_MS),
      completed(2 * DAY_MS),
      completed(3 * DAY_MS),
      completed(4 * DAY_MS),
      completed(5 * DAY_MS),
    ])
    const totalCount = histogram.buckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0,
    )

    expect(totalCount).toBe(5)
    expect(histogram.validCycleTimeCount).toBe(5)
    expect(histogram.buckets.at(-1)?.count).toBeGreaterThan(0)
    expect(histogram.buckets.at(-1)?.upperBoundDays).toBe(5)
  })

  it('excludes running, not-started, invalid, and negative cycle times', () => {
    const histogram = calculateForDurations([
      completed(DAY_MS),
      running(2 * DAY_MS),
      null,
      completed(null),
      completed(Number.NaN),
      completed(-1),
      completed(3 * DAY_MS),
    ])

    expect(histogram.validCycleTimeCount).toBe(2)
    expect(
      histogram.buckets.reduce((sum, bucket) => sum + bucket.count, 0),
    ).toBe(2)
  })
})
