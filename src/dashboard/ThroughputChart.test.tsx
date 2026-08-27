import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThroughputChart } from './ThroughputChart'

describe('ThroughputChart', () => {
  it('shows weekly throughput including an empty week and unambiguous labels', () => {
    render(
      <ThroughputChart
        weeks={[
          {
            isoWeekYear: 2025,
            isoWeek: 52,
            completedCount: 2,
            weekStart: '2025-12-22T00:00:00.000Z',
            weekEnd: '2025-12-28T23:59:59.999Z',
          },
          {
            isoWeekYear: 2026,
            isoWeek: 1,
            completedCount: 0,
            weekStart: '2026-01-05T00:00:00.000Z',
            weekEnd: '2026-01-11T23:59:59.999Z',
          },
          {
            isoWeekYear: 2026,
            isoWeek: 2,
            completedCount: 3,
            weekStart: '2026-01-12T00:00:00.000Z',
            weekEnd: '2026-01-18T23:59:59.999Z',
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Throughput' })).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: 'Throughput-Diagramm mit 3 Kalenderwochen',
      }),
    ).toBeVisible()
    expect(
      screen.getByLabelText('KW 52 / 2025: 2 abgeschlossene Tickets'),
    ).toBeVisible()
    expect(
      screen.getByLabelText('KW 1 / 2026: 0 abgeschlossene Tickets'),
    ).toBeVisible()
    expect(
      screen.getByLabelText('KW 2 / 2026: 3 abgeschlossene Tickets'),
    ).toBeVisible()
    expect(screen.getByText('ISO-Kalenderwoche')).toBeVisible()
  })

  it('shows a neutral state without completed tickets', () => {
    render(<ThroughputChart weeks={[]} />)

    expect(
      screen.getByText(
        'Keine abgeschlossenen Tickets für den Throughput verfügbar.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
