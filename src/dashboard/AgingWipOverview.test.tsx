import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AgingWipList } from './AgingWipOverview'

describe('AgingWipList', () => {
  it('shows ticket information and proportional age bars', () => {
    render(
      <AgingWipList
        items={[
          {
            issueId: 12,
            subject: 'Altes Ticket',
            currentStatus: 'Review',
            startedAt: '2026-01-01T00:00:00Z',
            ageMs: 10 * 24 * 60 * 60 * 1000,
            ageDays: 10,
          },
          {
            issueId: 13,
            subject: 'Jüngeres Ticket',
            currentStatus: 'In Progress',
            startedAt: '2026-01-08T12:00:00Z',
            ageMs: 2.5 * 24 * 60 * 60 * 1000,
            ageDays: 2.5,
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Aging WIP' })).toBeVisible()
    expect(
      screen.getByLabelText(
        'Ticket #12: Altes Ticket, Status Review, bisheriges Alter 10 Tage',
      ),
    ).toBeVisible()
    expect(
      screen.getByLabelText(
        'Ticket #13: Jüngeres Ticket, Status In Progress, bisheriges Alter 2.5 Tage',
      ),
    ).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows a neutral state without running Cycle Times', () => {
    render(<AgingWipList items={[]} />)

    expect(
      screen.getByText(
        'Aktuell befinden sich keine laufenden Tickets im Aging WIP.',
      ),
    ).toBeVisible()
  })
})
