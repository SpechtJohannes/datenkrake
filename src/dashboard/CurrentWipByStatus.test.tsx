import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CurrentWipStatusBars } from './CurrentWipByStatus'

describe('CurrentWipStatusBars', () => {
  it('shows status names, counts, and proportional bars', () => {
    render(
      <CurrentWipStatusBars
        statuses={[
          { statusId: 2, statusName: 'Refined', issueCount: 1 },
          { statusId: 3, statusName: 'In Progress', issueCount: 4 },
          { statusId: 4, statusName: 'Review', issueCount: 2 },
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Aktueller WIP nach Status' }),
    ).toBeVisible()
    expect(screen.getByLabelText('Refined: 1 Ticket')).toBeVisible()
    expect(screen.getByLabelText('In Progress: 4 Tickets')).toBeVisible()
    expect(screen.getByLabelText('Review: 2 Tickets')).toBeVisible()
  })

  it('shows a neutral state without current WIP', () => {
    render(<CurrentWipStatusBars statuses={[]} />)
    expect(
      screen.getByText(
        'Aktuell befinden sich keine Tickets im Work in Progress.',
      ),
    ).toBeVisible()
  })
})
