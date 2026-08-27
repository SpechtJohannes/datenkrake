import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CycleTimeResult } from './cycleTime'
import { calculateCycleTime } from './cycleTime'
import type { StatusHistoryIssue } from './statusHistory'
import { calculateWipHistory } from './wipHistory'

vi.mock('./cycleTime', () => ({ calculateCycleTime: vi.fn() }))

const mockedCalculateCycleTime = vi.mocked(calculateCycleTime)
const statuses = [
  { id: 2, name: 'Refined', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function issue(id: number): StatusHistoryIssue {
  return {
    status: { id, name: `Status ${id}`, is_closed: false },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
  }
}

function completed(startedAt: string, endedAt: string): CycleTimeResult {
  return { startedAt, endedAt, durationMs: 1, isRunning: false }
}

function running(startedAt: string): CycleTimeResult {
  return { startedAt, endedAt: null, durationMs: null, isRunning: true }
}

function calculate(
  results: readonly (CycleTimeResult | null)[],
  referenceTime = '2026-01-05T12:00:00Z',
) {
  results.forEach((result) =>
    mockedCalculateCycleTime.mockReturnValueOnce(result),
  )
  return calculateWipHistory(
    results.map((_, index) => issue(index + 1)),
    statuses,
    referenceTime,
  )
}

describe('calculateWipHistory', () => {
  beforeEach(() => mockedCalculateCycleTime.mockReset())

  it('returns no points without a started cycle time', () => {
    expect(calculate([null])).toEqual([])
  })

  it('keeps a running cycle time in WIP through the reference day', () => {
    const points = calculate([running('2026-01-02T00:00:00Z')])

    expect(points.map((point) => [point.date, point.wipCount])).toEqual([
      ['2026-01-02', 1],
      ['2026-01-03', 1],
      ['2026-01-04', 1],
      ['2026-01-05', 1],
    ])
  })

  it('uses a completed cycle as a start-inclusive and end-exclusive interval', () => {
    const points = calculate([
      completed('2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z'),
    ])

    expect(points.map((point) => point.wipCount)).toEqual([1, 1, 0])
  })

  it('counts overlapping cycles and calculates the correct maximum WIP', () => {
    const points = calculate([
      completed('2026-01-01T00:00:00Z', '2026-01-04T00:00:00Z'),
      completed('2026-01-02T00:00:00Z', '2026-01-05T00:00:00Z'),
      completed('2026-01-03T00:00:00Z', '2026-01-04T00:00:00Z'),
    ])

    expect(points.map((point) => point.wipCount)).toEqual([1, 2, 3, 1, 0])
    expect(Math.max(...points.map((point) => point.wipCount))).toBe(3)
  })

  it('represents non-overlapping cycles and same-day exits and entries deterministically', () => {
    const points = calculate([
      completed('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
      completed('2026-01-02T00:00:00Z', '2026-01-03T00:00:00Z'),
      completed('2026-01-04T00:00:00Z', '2026-01-05T00:00:00Z'),
    ])

    expect(points.map((point) => point.wipCount)).toEqual([1, 1, 0, 1, 0])
  })

  it('uses UTC day boundaries and returns chronologically ordered points', () => {
    const points = calculate([
      completed('2026-01-01T23:30:00-02:00', '2026-01-04T00:30:00+02:00'),
    ])

    expect(points).toEqual([
      { date: '2026-01-02', timestampMs: 1767312000000, wipCount: 0 },
      { date: '2026-01-03', timestampMs: 1767398400000, wipCount: 1 },
    ])
  })

  it('ignores an issue without Refined and does not inspect status history itself', () => {
    const points = calculate([
      null,
      completed('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
    ])

    expect(points.map((point) => point.wipCount)).toEqual([1, 0])
    expect(mockedCalculateCycleTime).toHaveBeenCalledTimes(2)
  })

  it('ignores invalid and negative intervals defensively', () => {
    expect(
      calculate([
        completed('invalid', '2026-01-03T00:00:00Z'),
        completed('2026-01-03T00:00:00Z', '2026-01-02T00:00:00Z'),
      ]),
    ).toEqual([])
  })
})
