import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CycleTimeTrend } from './CycleTimeTrend'

const DAY_MS = 24 * 60 * 60 * 1000

describe('CycleTimeTrend', () => {
  it('shows multiple accessible points, axes, and percentile references', () => {
    render(
      <CycleTimeTrend
        metrics={{
          medianCompletedDurationMs: 2 * DAY_MS,
          p85CompletedDurationMs: 3 * DAY_MS,
          p95CompletedDurationMs: 4 * DAY_MS,
          completedCount: 2,
          runningCount: 0,
        }}
        points={[
          {
            issueId: 101,
            subject: 'Erstes Ticket',
            completedAt: '2026-01-02T00:00:00Z',
            completedAtMs: Date.parse('2026-01-02T00:00:00Z'),
            durationMs: 2 * DAY_MS,
            durationDays: 2,
          },
          {
            issueId: 102,
            subject: 'Zweites Ticket',
            completedAt: '2026-01-02T00:00:00Z',
            completedAtMs: Date.parse('2026-01-02T00:00:00Z'),
            durationMs: 4 * DAY_MS,
            durationDays: 4,
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Cycle Time Verlauf' }),
    ).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: 'Punktdiagramm mit 2 abgeschlossenen Issues',
      }),
    ).toBeVisible()
    expect(
      screen.getByLabelText(
        /Issue #101: Erstes Ticket, abgeschlossen 02\.01\.2026, 00:00, Cycle Time 2d/,
      ),
    ).toBeVisible()
    expect(
      screen.getByLabelText(
        /Issue #102: Zweites Ticket, abgeschlossen 02\.01\.2026, 00:00, Cycle Time 4d/,
      ),
    ).toBeVisible()
    expect(screen.getByText('02.01.2026')).toBeVisible()
    expect(screen.getByText('Cycle Time in Tagen')).toBeVisible()
    expect(screen.getByLabelText('P50 Referenz: 2d')).toBeVisible()
    expect(screen.getByLabelText('P85 Referenz: 3d')).toBeVisible()
    expect(screen.getByLabelText('P95 Referenz: 4d')).toBeVisible()
  })

  it('shows a neutral state without completed cycle times', () => {
    render(
      <CycleTimeTrend
        metrics={{
          medianCompletedDurationMs: null,
          p85CompletedDurationMs: null,
          p95CompletedDurationMs: null,
          completedCount: 0,
          runningCount: 2,
        }}
        points={[]}
      />,
    )

    expect(
      screen.getByText(
        'Keine abgeschlossenen Cycle Times für den zeitlichen Verlauf verfügbar.',
      ),
    ).toBeVisible()
    expect(
      screen.queryByRole('img', { name: /Punktdiagramm/ }),
    ).not.toBeInTheDocument()
  })
})
