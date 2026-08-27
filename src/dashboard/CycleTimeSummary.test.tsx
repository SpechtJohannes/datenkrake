import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CycleTimeSummary } from './CycleTimeSummary'

describe('CycleTimeSummary', () => {
  it('shows the formatted percentiles and completed and running counts', () => {
    render(
      <CycleTimeSummary
        metrics={{
          medianCompletedDurationMs:
            2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
          p85CompletedDurationMs: 3 * 24 * 60 * 60 * 1000,
          p95CompletedDurationMs: 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
          completedCount: 7,
          runningCount: 3,
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Cycle-Time-Übersicht' }),
    ).toBeVisible()
    expect(screen.getByLabelText('Median Cycle Time: 2d 4h')).toBeVisible()
    expect(screen.getByLabelText('P85 Cycle Time: 3d')).toBeVisible()
    expect(screen.getByLabelText('P95 Cycle Time: 4d 12h')).toBeVisible()
    expect(screen.getByLabelText('Abgeschlossene Tickets: 7')).toBeVisible()
    expect(screen.getByLabelText('Laufende Tickets: 3')).toBeVisible()
  })

  it('shows a neutral state when no completed values are available', () => {
    render(
      <CycleTimeSummary
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
      screen.getByLabelText('Median Cycle Time: Nicht verfügbar'),
    ).toBeVisible()
    expect(
      screen.getByLabelText('P85 Cycle Time: Nicht verfügbar'),
    ).toBeVisible()
    expect(
      screen.getByLabelText('P95 Cycle Time: Nicht verfügbar'),
    ).toBeVisible()
    expect(screen.getByLabelText('Abgeschlossene Tickets: 0')).toBeVisible()
    expect(screen.getByLabelText('Laufende Tickets: 2')).toBeVisible()
  })
})
