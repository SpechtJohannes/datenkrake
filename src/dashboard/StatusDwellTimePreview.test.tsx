import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type {
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
} from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import { StatusDwellTimePreview } from './StatusDwellTimePreview'

const statusDefinitions: readonly StatusDefinition[] = [
  { id: 1, name: 'New', is_closed: false },
  { id: 2, name: 'Refined', is_closed: false },
  { id: 3, name: 'In Progress', is_closed: false },
  { id: 4, name: 'Review', is_closed: false },
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

function createJournal(
  id: number,
  createdOn: string,
  detail: RedmineJournalDetail,
): RedmineJournal {
  return {
    id,
    user: { id: 1, name: 'Testnutzer' },
    notes: '',
    created_on: createdOn,
    private_notes: false,
    details: [detail],
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
    subject: `Kontrollticket ${id}`,
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

describe('StatusDwellTimePreview', () => {
  it('shows issue details and multiple formatted status dwell times', () => {
    const issue = createIssue(101, {
      subject: 'Mehrere Statusphasen',
      status: { id: 4, name: 'Review', is_closed: false },
      journals: [
        createJournal(1, '2026-01-02T00:00:00Z', statusChange(1, 2)),
        createJournal(2, '2026-01-03T00:00:00Z', statusChange(2, 4)),
      ],
    })

    render(
      <StatusDwellTimePreview
        issues={[issue]}
        referenceTime="2026-01-04T00:00:00Z"
        statusDefinitions={statusDefinitions}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Statusverweilzeiten' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        name: 'Issue #101: Mehrere Statusphasen',
      }),
    ).toBeVisible()
    expect(
      screen.getByText('Review', { selector: 'strong' }).closest('p'),
    ).toHaveTextContent('Aktueller Status: Review')

    const table = screen.getByRole('table', {
      name: 'Statusverweilzeiten für Issue #101',
    })
    const rows = within(table).getAllByRole('row')
    const historicalCells = within(rows[1]).getAllByRole('cell')
    const currentCells = within(rows[3]).getAllByRole('cell')
    expect(rows).toHaveLength(4)
    expect(historicalCells.map((cell) => cell.textContent)).toEqual([
      '1',
      'New',
      '1d',
      '1',
      '–',
    ])
    expect(currentCells.map((cell) => cell.textContent)).toEqual([
      '4',
      'Review',
      '1d',
      '1',
      'Aktuell',
    ])
    const cycleTimeDetails = screen.getByLabelText('Cycle Time für Issue #101')
    expect(within(cycleTimeDetails).getByText('Läuft')).toBeVisible()
    expect(within(cycleTimeDetails).getByText('2d')).toBeVisible()
    expect(
      within(cycleTimeDetails).getByText('02.01.2026, 00:00'),
    ).toHaveAttribute('datetime', '2026-01-02T00:00:00Z')
  })

  it('limits the plausibility preview to the first ten issues', () => {
    const issues = Array.from({ length: 11 }, (_, index) =>
      createIssue(index + 1),
    )

    render(
      <StatusDwellTimePreview
        issues={issues}
        referenceTime="2026-01-02T00:00:00Z"
        statusDefinitions={statusDefinitions}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Issue #10: Kontrollticket 10' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Issue #11: Kontrollticket 11' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(10)
  })

  it('uses one shared reference time for all open issue phases and cycle times', () => {
    const issues = [1, 2].map((id) =>
      createIssue(id, {
        status: { id: 2, name: 'Refined', is_closed: false },
        journals: [
          createJournal(id, '2026-01-02T00:00:00Z', statusChange(1, 2)),
        ],
      }),
    )

    render(
      <StatusDwellTimePreview
        issues={issues}
        referenceTime="2026-01-04T00:00:00Z"
        statusDefinitions={statusDefinitions}
      />,
    )

    const dwellTimeTables = screen.getAllByRole('table', {
      name: /Statusverweilzeiten für Issue/,
    })
    expect(dwellTimeTables).toHaveLength(2)
    const firstCycleTime = screen.getByLabelText('Cycle Time für Issue #1')
    const secondCycleTime = screen.getByLabelText('Cycle Time für Issue #2')
    expect(within(firstCycleTime).getByText('2d')).toBeVisible()
    expect(within(secondCycleTime).getByText('2d')).toBeVisible()
  })

  it('keeps a historical status without a catalog definition transparent', () => {
    const issue = createIssue(106, {
      status: { id: 3, name: 'In Progress', is_closed: false },
      journals: [
        createJournal(1, '2026-01-02T00:00:00Z', statusChange(1, 6)),
        createJournal(2, '2026-01-03T00:00:00Z', statusChange(6, 3)),
      ],
    })

    render(
      <StatusDwellTimePreview
        issues={[issue]}
        referenceTime="2026-01-04T00:00:00Z"
        statusDefinitions={statusDefinitions}
      />,
    )

    const table = screen.getByRole('table', {
      name: /Statusverweilzeiten.*Issue #106/,
    })
    expect(within(table).getByText('New')).toBeVisible()
    expect(within(table).getByText('Nicht bekannt')).toBeVisible()
    expect(within(table).getByText('In Progress')).toBeVisible()
  })
})
