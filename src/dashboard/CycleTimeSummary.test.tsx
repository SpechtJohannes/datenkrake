import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateCycleTimeMetrics } from '../domain/cycleTimeMetrics'
import { CycleTimeSummary } from './CycleTimeSummary'

vi.mock('../domain/cycleTimeMetrics', () => ({
  calculateCycleTimeMetrics: vi.fn(),
}))

const mockedCalculateCycleTimeMetrics = vi.mocked(calculateCycleTimeMetrics)

describe('CycleTimeSummary', () => {
  beforeEach(() => {
    mockedCalculateCycleTimeMetrics.mockReset()
  })

  it('shows the formatted median and completed and running counts', () => {
    mockedCalculateCycleTimeMetrics.mockReturnValue({
      medianCompletedDurationMs: 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
      p85CompletedDurationMs: 3 * 24 * 60 * 60 * 1000,
      p95CompletedDurationMs: 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
      completedCount: 7,
      runningCount: 3,
    })

    render(
      <CycleTimeSummary
        issues={[]}
        statusDefinitions={[]}
        referenceTime="2026-01-10T00:00:00Z"
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

  it('shows a neutral state when no completed median is available', () => {
    mockedCalculateCycleTimeMetrics.mockReturnValue({
      medianCompletedDurationMs: null,
      p85CompletedDurationMs: null,
      p95CompletedDurationMs: null,
      completedCount: 0,
      runningCount: 2,
    })

    render(
      <CycleTimeSummary
        issues={[]}
        statusDefinitions={[]}
        referenceTime="2026-01-10T00:00:00Z"
      />,
    )

    expect(
      screen.getByLabelText('Median Cycle Time: Nicht verfügbar'),
    ).toBeVisible()
    expect(screen.getByLabelText('Abgeschlossene Tickets: 0')).toBeVisible()
    expect(screen.getByLabelText(/P85 Cycle Time: Nicht/)).toBeVisible()
    expect(screen.getByLabelText(/P95 Cycle Time: Nicht/)).toBeVisible()
    expect(screen.getByLabelText('Laufende Tickets: 2')).toBeVisible()
  })
})
