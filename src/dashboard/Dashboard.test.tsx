import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIssues, type RedmineIssue } from '../data/issues'
import { Dashboard } from './Dashboard'

vi.mock('../data/issues', () => ({
  getIssues: vi.fn(),
}))

const mockedGetIssues = vi.mocked(getIssues)

function createIssue(
  id: number,
  status: { id: number; name: string },
  journalCount: number,
): RedmineIssue {
  const reference = { id: 1, name: 'Beispiel' }

  return {
    id,
    project: reference,
    tracker: reference,
    status: { ...status, is_closed: false },
    priority: reference,
    author: reference,
    assigned_to: reference,
    category: reference,
    fixed_version: reference,
    subject: `Issue ${id}`,
    description: 'Testbeschreibung',
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
    journals: Array.from({ length: journalCount }, (_, index) => ({
      id: id * 10 + index,
      user: reference,
      notes: 'Testjournal',
      created_on: '2026-01-01T00:00:00Z',
      private_notes: false,
      details: [],
    })),
  }
}

const issues = [
  createIssue(101, { id: 1, name: 'Neu' }, 1),
  createIssue(102, { id: 1, name: 'Neu' }, 0),
  createIssue(103, { id: 2, name: 'Erledigt' }, 2),
  createIssue(104, { id: 2, name: 'Erledigt' }, 0),
  createIssue(105, { id: 1, name: 'Neu' }, 1),
  createIssue(106, { id: 1, name: 'Neu' }, 0),
]

describe('Dashboard', () => {
  beforeEach(() => {
    mockedGetIssues.mockReset()
  })

  it('shows a loading state while issues are being loaded', () => {
    mockedGetIssues.mockReturnValue(new Promise(() => undefined))

    render(<Dashboard />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Issues werden geladen',
    )
  })

  it('loads issues and displays summary values and the first five issues', async () => {
    mockedGetIssues.mockResolvedValue(issues)

    render(<Dashboard />)

    expect(
      await screen.findByLabelText('Geladene Issues: 6'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Unterschiedliche Status: 2')).toBeVisible()
    expect(
      screen.getByLabelText('Issues mit Journaleinträgen: 3'),
    ).toBeVisible()

    const table = screen.getByRole('table')
    expect(within(table).getByText('Issue 101')).toBeVisible()
    expect(within(table).getByText('Issue 105')).toBeVisible()
    expect(within(table).queryByText('Issue 106')).not.toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(6)

    const previewRow = within(table).getByText('Issue 103').closest('tr')
    expect(previewRow).not.toBeNull()
    expect(within(previewRow!).getByText('103')).toBeVisible()
    expect(within(previewRow!).getByText('Erledigt')).toBeVisible()
    expect(within(previewRow!).getByText('2')).toBeVisible()
    expect(mockedGetIssues).toHaveBeenCalledOnce()
  })

  it('shows an understandable error when loading fails', async () => {
    mockedGetIssues.mockRejectedValue(new Error('Test error'))

    render(<Dashboard />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Die Ticketdaten konnten nicht geladen werden',
    )
  })
})
