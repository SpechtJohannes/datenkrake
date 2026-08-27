import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AggregatedStatusDwellTimeBars } from './AggregatedStatusDwellTimes'

describe('AggregatedStatusDwellTimeBars', () => {
  it('shows names, median, average, count, and median-based bars', () => {
    const { container } = render(
      <AggregatedStatusDwellTimeBars
        statuses={[
          {
            statusId: 2,
            statusName: 'Refined',
            dwellTimeCount: 3,
            medianDurationMs: 2 * 24 * 60 * 60 * 1000,
            averageDurationMs: 2.5 * 24 * 60 * 60 * 1000,
          },
          {
            statusId: 3,
            statusName: 'In Progress',
            dwellTimeCount: 2,
            medianDurationMs: 4 * 24 * 60 * 60 * 1000,
            averageDurationMs: 5 * 24 * 60 * 60 * 1000,
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Aggregierte Statusverweilzeiten' }),
    ).toBeVisible()
    expect(
      screen.getByLabelText(
        'Refined: Median 2 d, Durchschnitt 2.5 d, 3 Verweilzeiten',
      ),
    ).toBeVisible()
    expect(
      screen.getByLabelText(
        'In Progress: Median 4 d, Durchschnitt 5 d, 2 Verweilzeiten',
      ),
    ).toBeVisible()
    expect(container.querySelectorAll('.aggregated-dwell-bar')[0]).toHaveStyle({
      width: '50%',
    })
    expect(container.querySelectorAll('.aggregated-dwell-bar')[1]).toHaveStyle({
      width: '100%',
    })
  })

  it('shows a neutral state without usable dwell times', () => {
    render(<AggregatedStatusDwellTimeBars statuses={[]} />)
    expect(
      screen.getByText('Keine verwertbaren Statusverweilzeiten verfügbar.'),
    ).toBeVisible()
  })
})
