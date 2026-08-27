import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThroughputDistributionChart } from './ThroughputDistribution'

describe('ThroughputDistributionChart', () => {
  it('shows weekly labels, metrics, counts, proportional bars, and a zero week', () => {
    const { container } = render(
      <ThroughputDistributionChart
        distribution={{
          weeks: [
            {
              isoWeekYear: 2026,
              isoWeek: 2,
              completedCount: 2,
              weekStart: '2026-01-05T00:00:00.000Z',
              weekEnd: '2026-01-11T23:59:59.999Z',
            },
            {
              isoWeekYear: 2026,
              isoWeek: 3,
              completedCount: 0,
              weekStart: '2026-01-12T00:00:00.000Z',
              weekEnd: '2026-01-18T23:59:59.999Z',
            },
            {
              isoWeekYear: 2026,
              isoWeek: 4,
              completedCount: 4,
              weekStart: '2026-01-19T00:00:00.000Z',
              weekEnd: '2026-01-25T23:59:59.999Z',
            },
          ],
          weekCount: 3,
          totalThroughput: 6,
          averageThroughput: 2,
          medianThroughput: 2,
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Throughput Verteilung' }),
    ).toBeVisible()
    expect(
      screen.getByLabelText('KW 2 / 2026: 2 abgeschlossene Tickets'),
    ).toBeVisible()
    expect(
      screen.getByLabelText('KW 3 / 2026: 0 abgeschlossene Tickets'),
    ).toBeVisible()
    expect(
      screen.getByLabelText('KW 4 / 2026: 4 abgeschlossene Tickets'),
    ).toBeVisible()
    expect(
      screen.getByText('Durchschnitt pro Woche').nextSibling,
    ).toHaveTextContent('2')
    expect(screen.getByText('Median pro Woche').nextSibling).toHaveTextContent(
      '2',
    )
    const bars = container.querySelectorAll('.throughput-distribution-bar')
    expect(bars[0]).toHaveStyle({ width: '50%' })
    expect(bars[1]).toHaveStyle({ width: '0%' })
    expect(bars[2]).toHaveStyle({ width: '100%' })
  })

  it('shows a neutral state without completed tickets', () => {
    render(
      <ThroughputDistributionChart
        distribution={{
          weeks: [],
          weekCount: 0,
          totalThroughput: 0,
          averageThroughput: null,
          medianThroughput: null,
        }}
      />,
    )

    expect(
      screen.getByText(
        'Keine abgeschlossenen Tickets für die Throughput-Verteilung verfügbar.',
      ),
    ).toBeVisible()
  })
})
