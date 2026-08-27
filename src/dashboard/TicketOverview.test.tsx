import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type {
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
} from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import { TicketOverview } from './TicketOverview'

const statusDefinitions: readonly StatusDefinition[] = [
  { id: 1, name: 'New', is_closed: false },
  { id: 2, name: 'Refined', is_closed: false },
  { id: 3, name: 'In Progress', is_closed: false },
  { id: 5, name: 'Done', is_closed: true },
]

function statusChange(
  oldStatusId: number,
  newStatusId: number,
): RedmineJournalDetail {
  return {
    property: 'attr',
    name: 'status_id',
    old_value: String(oldStatusId),
    new_value: String(newStatusId),
  }
}

function journal(
  id: number,
  createdOn: string,
  oldId: number,
  newId: number,
): RedmineJournal {
  return {
    id,
    user: { id: 1, name: 'Testnutzer' },
    notes: '',
    created_on: createdOn,
    private_notes: false,
    details: [statusChange(oldId, newId)],
  }
}

function createIssue(
  id: number,
  overrides: Partial<RedmineIssue> = {},
): RedmineIssue {
  const reference = { id: 1, name: 'Beispiel' }
  return {
    id,
    project: reference,
    tracker: reference,
    status: { id: 1, name: 'New', is_closed: false },
    priority: reference,
    author: reference,
    assigned_to: reference,
    category: reference,
    fixed_version: reference,
    subject: `Ticket ${id}`,
    description: '',
    start_date: '2026-01-01',
    due_date: '2026-01-02',
    done_ratio: 0,
    is_private: false,
    estimated_hours: 1,
    total_estimated_hours: null,
    spent_hours: 0,
    total_spent_hours: null,
    custom_fields: [],
    created_on: '2026-01-01T00:00:00Z',
    updated_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
    ...overrides,
  }
}

function renderOverview(issues: readonly RedmineIssue[]) {
  return render(
    <TicketOverview
      issues={issues}
      referenceTime="2026-01-04T00:00:00Z"
      statusDefinitions={statusDefinitions}
    />,
  )
}

describe('TicketOverview', () => {
  it('shows every loaded ticket without a five- or ten-ticket limit', () => {
    renderOverview(
      Array.from({ length: 12 }, (_, index) => createIssue(index + 1)),
    )

    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(12)
    expect(
      screen.getByRole('button', { name: /Ticket #1: Ticket 1\./ }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: /Ticket #6: Ticket 6\./ }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: /Ticket #11: Ticket 11\./ }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: /Ticket #12: Ticket 12\./ }),
    ).toBeVisible()
  })

  it('shows compact ticket and running Cycle Time information', () => {
    renderOverview([
      createIssue(101, {
        subject: 'Laufendes Ticket',
        status: { id: 2, name: 'Refined', is_closed: false },
        journals: [journal(1, '2026-01-02T00:00:00Z', 1, 2)],
      }),
      createIssue(102),
    ])

    const running = screen.getByRole('button', {
      name: /Ticket #101: Laufendes Ticket\./,
    })
    expect(running).toHaveTextContent('Aktueller StatusRefined')
    expect(running).toHaveTextContent('Cycle Time StatusLäuft')
    expect(running).toHaveTextContent('Cycle Time Dauer2d')
    expect(
      screen.getByRole('button', { name: /Ticket #102: Ticket 102\./ }),
    ).toHaveTextContent('Noch nicht gestartet')
  })

  it('starts collapsed and opens and closes Cycle Time and dwell-time details', async () => {
    const user = userEvent.setup()
    renderOverview([
      createIssue(101, {
        status: { id: 2, name: 'Refined', is_closed: false },
        journals: [journal(1, '2026-01-02T00:00:00Z', 1, 2)],
      }),
    ])
    const toggle = screen.getByRole('button', {
      name: /Ticket #101: Ticket 101\./,
    })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByLabelText('Cycle Time für Issue #101'),
    ).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const cycleDetails = screen.getByLabelText('Cycle Time für Issue #101')
    expect(within(cycleDetails).getByText('Läuft')).toBeVisible()
    expect(within(cycleDetails).getByText('02.01.2026, 00:00')).toBeVisible()
    expect(within(cycleDetails).getByText('Noch offen')).toBeVisible()
    expect(within(cycleDetails).getByText('2d')).toBeVisible()
    const dwellTable = screen.getByRole('table', {
      name: 'Statusverweilzeiten für Issue #101',
    })
    expect(within(dwellTable).getByText('New')).toBeVisible()
    expect(within(dwellTable).getByText('Refined')).toBeVisible()
    expect(within(dwellTable).getByText('Aktuell')).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByLabelText('Cycle Time für Issue #101'),
    ).not.toBeInTheDocument()
  })

  it('allows multiple tickets to stay open simultaneously', async () => {
    const user = userEvent.setup()
    renderOverview([createIssue(1), createIssue(2)])
    const first = screen.getByRole('button', { name: /Ticket #1: Ticket 1\./ })
    const second = screen.getByRole('button', { name: /Ticket #2: Ticket 2\./ })

    await user.click(first)
    await user.click(second)

    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Cycle Time für Issue #1')).toBeVisible()
    expect(screen.getByLabelText('Cycle Time für Issue #2')).toBeVisible()
  })

  it('supports native keyboard operation', async () => {
    const user = userEvent.setup()
    renderOverview([createIssue(1)])
    const toggle = screen.getByRole('button', { name: /Ticket #1: Ticket 1\./ })

    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
