import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CycleTimeDistribution } from './CycleTimeDistribution'

describe('CycleTimeDistribution', () => {
  it('shows histogram intervals, counts, and percentile markers', () => {
    render(
      <CycleTimeDistribution
        histogram={{
          buckets: [
            { lowerBoundDays: 1, upperBoundDays: 2, count: 2 },
            { lowerBoundDays: 2, upperBoundDays: 3, count: 1 },
            { lowerBoundDays: 3, upperBoundDays: 4, count: 3 },
          ],
          minDurationMs: 24 * 60 * 60 * 1000,
          maxDurationMs: 4 * 24 * 60 * 60 * 1000,
          validCycleTimeCount: 6,
        }}
        metrics={{
          medianCompletedDurationMs: 2 * 24 * 60 * 60 * 1000,
          p85CompletedDurationMs: 3 * 24 * 60 * 60 * 1000,
          p95CompletedDurationMs: 4 * 24 * 60 * 60 * 1000,
          completedCount: 6,
          runningCount: 1,
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Cycle Time Verteilung' }),
    ).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: 'Histogramm mit 6 abgeschlossenen Tickets',
      }),
    ).toBeVisible()
    expect(screen.getByLabelText('1–<2 d: 2 Tickets')).toBeVisible()
    expect(screen.getByLabelText('2–<3 d: 1 Tickets')).toBeVisible()
    expect(screen.getByLabelText('3–4 d: 3 Tickets')).toBeVisible()
    expect(screen.getByLabelText('P50: 2d')).toBeVisible()
    expect(screen.getByLabelText('P85: 3d')).toBeVisible()
    expect(screen.getByLabelText('P95: 4d')).toBeVisible()
  })

  it('shows a neutral state without completed cycle times', () => {
    render(
      <CycleTimeDistribution
        histogram={{
          buckets: [],
          minDurationMs: null,
          maxDurationMs: null,
          validCycleTimeCount: 0,
        }}
        metrics={{
          medianCompletedDurationMs: null,
          p85CompletedDurationMs: null,
          p95CompletedDurationMs: null,
          completedCount: 0,
          runningCount: 2,
        }}
      />,
    )

    expect(
      screen.getByText(
        'Keine abgeschlossenen Cycle Times für die Verteilung verfügbar.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
