import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIssues, type RedmineIssue } from '../data/issues'
import { getStatuses } from '../data/statusDefinitions'
import { Dashboard } from './Dashboard'
import {
  createDefaultVisibility,
  DASHBOARD_VISIBILITY_STORAGE_KEY,
} from './dashboardVisibility'

vi.mock('../data/issues', () => ({ getIssues: vi.fn() }))
vi.mock('../data/statusDefinitions', () => ({ getStatuses: vi.fn() }))

const mockedGetIssues = vi.mocked(getIssues)
const mockedGetStatuses = vi.mocked(getStatuses)

function issue(): RedmineIssue {
  const reference = { id: 1, name: 'Beispiel' }
  return {
    id: 1,
    project: reference,
    tracker: reference,
    status: { id: 1, name: 'New', is_closed: false },
    priority: reference,
    author: reference,
    assigned_to: reference,
    category: reference,
    fixed_version: reference,
    subject: 'Konfigurationstest',
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
  }
}

async function renderDashboard() {
  render(<Dashboard />)
  await screen.findByRole('button', { name: 'Dashboard anpassen' })
}

describe('Dashboard visibility settings', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedGetIssues.mockReset()
    mockedGetStatuses.mockReset()
    mockedGetIssues.mockResolvedValue([issue()])
    mockedGetStatuses.mockResolvedValue([
      { id: 1, name: 'New', is_closed: false },
      { id: 2, name: 'Refined', is_closed: false },
      { id: 5, name: 'Done', is_closed: true },
    ])
  })

  it('shows every section by default and opens and closes the dialog', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    const trigger = screen.getByRole('button', { name: 'Dashboard anpassen' })

    expect(screen.getByLabelText('Ticket-Kennzahlen')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Cycle-Time-Übersicht' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Cycle Time Verteilung' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Cycle Time Verlauf' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Throughput' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Work in Progress' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Aging WIP' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Aktueller WIP nach Status' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    await user.click(trigger)
    expect(
      screen.getByRole('dialog', { name: 'Dashboard anpassen' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Schließen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('toggles every section independently and can enable it again', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Dashboard anpassen' }))

    const cases = [
      ['Basiskennzahlen', () => screen.queryByLabelText('Ticket-Kennzahlen')],
      [
        'Cycle Time Übersicht',
        () => screen.queryByRole('heading', { name: 'Cycle-Time-Übersicht' }),
      ],
      [
        'Cycle Time Verteilung',
        () => screen.queryByRole('heading', { name: 'Cycle Time Verteilung' }),
      ],
      [
        'Cycle Time Verlauf',
        () => screen.queryByRole('heading', { name: 'Cycle Time Verlauf' }),
      ],
      [
        'Throughput',
        () => screen.queryByRole('heading', { name: 'Throughput' }),
      ],
      [
        'Work in Progress',
        () => screen.queryByRole('heading', { name: 'Work in Progress' }),
      ],
      ['Aging WIP', () => screen.queryByRole('heading', { name: 'Aging WIP' })],
      [
        'Aktueller WIP nach Status',
        () =>
          screen.queryByRole('heading', {
            name: 'Aktueller WIP nach Status',
          }),
      ],
      ['Tickets', () => screen.queryByRole('heading', { name: 'Tickets' })],
    ] as const

    for (const [label, getSection] of cases) {
      const checkbox = screen.getByRole('checkbox', { name: label })
      await user.click(checkbox)
      expect(getSection()).not.toBeInTheDocument()
      await user.click(checkbox)
      expect(getSection()).toBeVisible()
    }
  })

  it('stores independent changes and restores stored visibility on load', async () => {
    localStorage.setItem(
      DASHBOARD_VISIBILITY_STORAGE_KEY,
      JSON.stringify({
        ...createDefaultVisibility(),
        currentWipByStatus: false,
      }),
    )
    const user = userEvent.setup()
    await renderDashboard()

    expect(
      screen.queryByRole('heading', { name: 'Aktueller WIP nach Status' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dashboard anpassen' }))
    const currentWip = screen.getByRole('checkbox', {
      name: 'Aktueller WIP nach Status',
    })
    expect(currentWip).not.toBeChecked()
    await user.click(currentWip)

    expect(
      JSON.parse(localStorage.getItem(DASHBOARD_VISIBILITY_STORAGE_KEY) ?? ''),
    ).toMatchObject({ currentWipByStatus: true })
    expect(
      screen.getByRole('heading', { name: 'Aktueller WIP nach Status' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Work in Progress' }),
    ).toBeVisible()
  })

  it('restores defaults and updates persisted state', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Dashboard anpassen' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Aktueller WIP nach Status' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Standard wiederherstellen' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Aktueller WIP nach Status' }),
    ).toBeVisible()
    expect(
      JSON.parse(localStorage.getItem(DASHBOARD_VISIBILITY_STORAGE_KEY) ?? ''),
    ).toEqual(createDefaultVisibility())
  })

  it('allows an empty dashboard and shows a neutral hint', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Dashboard anpassen' }))

    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox)
    }

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aktuell sind keine Dashboard-Bereiche ausgewählt',
    )
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked()
    }
  })

  it('supports keyboard toggling and Escape with focus restoration', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    const trigger = screen.getByRole('button', { name: 'Dashboard anpassen' })
    trigger.focus()
    await user.keyboard('{Enter}')
    const checkbox = screen.getByRole('checkbox', { name: 'Tickets' })
    checkbox.focus()
    await user.keyboard(' ')
    expect(checkbox).not.toBeChecked()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
