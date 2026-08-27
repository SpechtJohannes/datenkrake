import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIssues, type RedmineIssue } from '../data/issues'
import { getStatuses } from '../data/statusDefinitions'
import { createDataExport, serializeDataExport } from '../export/dataExport'
import { loadRedmineIssues } from '../redmine/loadRedmineIssues'
import { Dashboard } from './Dashboard'

vi.mock('../data/issues', () => ({
  getIssues: vi.fn(),
}))
vi.mock('../data/statusDefinitions', () => ({
  getStatuses: vi.fn(),
}))
vi.mock('../redmine/loadRedmineIssues', () => ({
  loadRedmineIssues: vi.fn(),
}))

const mockedGetIssues = vi.mocked(getIssues)
const mockedGetStatuses = vi.mocked(getStatuses)
const mockedLoadRedmineIssues = vi.mocked(loadRedmineIssues)

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

function jsonFile(name: string, content: string): File {
  const file = new File([content], name, { type: 'application/json' })
  Object.defineProperty(file, 'text', {
    value: vi.fn().mockResolvedValue(content),
  })
  return file
}

function exportedFile(name: string, exportedIssues: readonly RedmineIssue[]): File {
  return jsonFile(
    name,
    serializeDataExport(
      createDataExport(exportedIssues, new Date('2026-08-27T14:00:00.000Z')),
    ),
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedGetIssues.mockReset()
    mockedGetStatuses.mockReset()
    mockedLoadRedmineIssues.mockReset()
    mockedGetStatuses.mockResolvedValue([
      { id: 1, name: 'Neu', is_closed: false },
      { id: 2, name: 'Erledigt', is_closed: true },
    ])
  })

  it('shows a loading state while issues are being loaded', () => {
    mockedGetIssues.mockReturnValue(new Promise(() => undefined))

    render(<Dashboard />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Issues werden geladen',
    )
  })

  it('loads issues once and displays all of them in the ticket overview', async () => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)

    render(<Dashboard />)

    expect(
      await screen.findByLabelText('Geladene Issues: 6'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Unterschiedliche Status: 2')).toBeVisible()
    expect(
      screen.getByLabelText('Issues mit Journaleinträgen: 3'),
    ).toBeVisible()

    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    expect(
      screen.getAllByRole('button', {
        name: /Ticket #10[1-6]: Issue 10[1-6]\./,
      }),
    ).toHaveLength(6)
    const lastTicket = screen.getByRole('button', {
      name: /Ticket #106: Issue 106\./,
    })
    await user.click(lastTicket)
    await user.click(lastTicket)
    expect(mockedGetIssues).toHaveBeenCalledOnce()
    expect(mockedGetStatuses).toHaveBeenCalledOnce()
  })

  it('initially identifies the mock data source and its issue count', async () => {
    mockedGetIssues.mockResolvedValue(issues)

    render(<Dashboard />)

    expect(await screen.findByText('Datenquelle: Mockdaten · 6 Issues')).toBeVisible()
    expect(screen.getByLabelText('JSON-Datei auswählen')).toHaveAttribute(
      'accept',
      'application/json,.json',
    )
  })

  it('loads a local JSON file and uses its issues in the dashboard', async () => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)
    const importedIssues = [
      createIssue(901, { id: 1, name: 'Neu' }, 0),
      createIssue(902, { id: 2, name: 'Erledigt' }, 1),
    ]
    render(<Dashboard />)
    await screen.findByText('Datenquelle: Mockdaten · 6 Issues')

    await user.upload(
      screen.getByLabelText('JSON-Datei auswählen'),
      exportedFile('mein-export.json', importedIssues),
    )

    expect(await screen.findByText('mein-export.json')).toBeVisible()
    expect(screen.getByText('Datenquelle: Importierte JSON-Datei · 2 Issues')).toBeVisible()
    expect(screen.getByLabelText('Geladene Issues: 2')).toBeVisible()
    expect(
      screen.getByRole('button', { name: /Ticket #901: Issue 901\./ }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /Ticket #101: Issue 101\./ }),
    ).not.toBeInTheDocument()
  })

  it.each([
    ['broken.json', '{not json', 'kein gültiges JSON'],
    [
      'foreign.json',
      JSON.stringify({
        ...createDataExport([], new Date('2026-08-27T14:00:00.000Z')),
        format: 'other',
      }),
      'kein gültiger Datenkrake-Export',
    ],
    [
      'future.json',
      JSON.stringify({
        ...createDataExport([], new Date('2026-08-27T14:00:00.000Z')),
        version: 2,
      }),
      'Version dieser Datenkrake-Datei wird nicht unterstützt',
    ],
    [
      'invalid-issues.json',
      JSON.stringify({
        ...createDataExport([], new Date('2026-08-27T14:00:00.000Z')),
        issues: [{ id: 1 }],
      }),
      'Datenstruktur der ausgewählten Datei ist ungültig',
    ],
  ])('shows an import error for %s and keeps the mock data', async (name, content, message) => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)
    render(<Dashboard />)
    await screen.findByText('Datenquelle: Mockdaten · 6 Issues')

    await user.upload(
      screen.getByLabelText('JSON-Datei auswählen'),
      jsonFile(name, content),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('Datenquelle: Mockdaten · 6 Issues')).toBeVisible()
    expect(screen.getByLabelText('Geladene Issues: 6')).toBeVisible()
  })

  it('keeps an imported data set active when a later import fails', async () => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)
    render(<Dashboard />)
    await screen.findByText('Datenquelle: Mockdaten · 6 Issues')

    await user.upload(
      screen.getByLabelText('JSON-Datei auswählen'),
      exportedFile('valid.json', [createIssue(901, { id: 1, name: 'Neu' }, 0)]),
    )
    await screen.findByText('Datenquelle: Importierte JSON-Datei · 1 Issue')
    await user.upload(
      screen.getByLabelText('JSON-Datei auswählen'),
      jsonFile('broken.json', '{broken'),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'bisherige Datenbestand bleibt aktiv',
    )
    expect(screen.getByText('valid.json')).toBeVisible()
    expect(screen.getByLabelText('Geladene Issues: 1')).toBeVisible()
  })

  it('replaces the first imported data set with a successful second import', async () => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)
    render(<Dashboard />)
    await screen.findByText('Datenquelle: Mockdaten · 6 Issues')

    await user.upload(
      screen.getByLabelText('JSON-Datei auswählen'),
      exportedFile('first.json', [createIssue(901, { id: 1, name: 'Neu' }, 0)]),
    )
    await screen.findByText('first.json')
    await user.upload(
      screen.getByLabelText('JSON-Datei auswählen'),
      exportedFile('second.json', [
        createIssue(902, { id: 1, name: 'Neu' }, 0),
        createIssue(903, { id: 2, name: 'Erledigt' }, 0),
      ]),
    )

    expect(await screen.findByText('second.json')).toBeVisible()
    expect(screen.getByText('Datenquelle: Importierte JSON-Datei · 2 Issues')).toBeVisible()
    expect(screen.queryByText('first.json')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Geladene Issues: 2')).toBeVisible()
  })

  it('uses successfully loaded Redmine issues as the active dashboard data', async () => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)
    mockedLoadRedmineIssues.mockResolvedValue([
      createIssue(951, { id: 1, name: 'Neu' }, 1),
      createIssue(952, { id: 2, name: 'Erledigt' }, 0),
    ])
    render(<Dashboard />)
    await screen.findByText('Datenquelle: Mockdaten · 6 Issues')

    await user.type(screen.getByLabelText('Redmine Basis-URL'), 'https://redmine.test')
    await user.type(screen.getByLabelText('Redmine API-Key'), 'top-secret')
    await user.type(screen.getByLabelText('Query-Parameter'), 'project_id=42')
    await user.click(screen.getByRole('button', { name: 'Issues aus Redmine laden' }))

    expect(await screen.findByText('Datenquelle: Redmine · 2 Issues')).toBeVisible()
    expect(screen.getByLabelText('Geladene Issues: 2')).toBeVisible()
    expect(
      screen.getByRole('button', { name: /Ticket #951: Issue 951\./ }),
    ).toBeVisible()
    expect(screen.queryByText('top-secret')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Redmine API-Key')).toHaveValue('')
    const persistedValues = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.getItem(localStorage.key(index) ?? ''),
    ).join(' ')
    expect(persistedValues).not.toContain('top-secret')
  })

  it('replaces an earlier Redmine result with a successful reload', async () => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)
    mockedLoadRedmineIssues
      .mockResolvedValueOnce([createIssue(951, { id: 1, name: 'Neu' }, 0)])
      .mockResolvedValueOnce([
        createIssue(961, { id: 1, name: 'Neu' }, 0),
        createIssue(962, { id: 2, name: 'Erledigt' }, 0),
      ])
    render(<Dashboard />)
    await screen.findByText('Datenquelle: Mockdaten · 6 Issues')

    const baseUrlInput = screen.getByLabelText('Redmine Basis-URL')
    const apiKeyInput = screen.getByLabelText('Redmine API-Key')
    await user.type(baseUrlInput, 'https://redmine.test')
    await user.type(apiKeyInput, 'first-key')
    await user.click(screen.getByRole('button', { name: 'Issues aus Redmine laden' }))
    await screen.findByText('Datenquelle: Redmine · 1 Issue')
    await user.type(apiKeyInput, 'second-key')
    await user.click(screen.getByRole('button', { name: 'Issues aus Redmine laden' }))

    expect(await screen.findByText('Datenquelle: Redmine · 2 Issues')).toBeVisible()
    expect(screen.queryByText('Issue 951')).not.toBeInTheDocument()
    expect(screen.getByText('Issue 962')).toBeVisible()
  })

  it('exports only the issues previously loaded from Redmine', async () => {
    const user = userEvent.setup()
    mockedGetIssues.mockResolvedValue(issues)
    mockedLoadRedmineIssues.mockResolvedValue([
      createIssue(971, { id: 1, name: 'Neu' }, 0),
    ])
    render(<Dashboard />)
    await screen.findByText('Datenquelle: Mockdaten · 6 Issues')
    await user.type(screen.getByLabelText('Redmine Basis-URL'), 'https://redmine.test')
    await user.type(screen.getByLabelText('Redmine API-Key'), 'export-secret')
    await user.click(screen.getByRole('button', { name: 'Issues aus Redmine laden' }))
    await screen.findByText('Datenquelle: Redmine · 1 Issue')

    const createObjectURL = vi.fn((blob: Blob) => {
      void blob
      return 'blob:redmine-export'
    })
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    await user.click(screen.getByRole('button', { name: 'JSON-Datei speichern' }))

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const json = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(String(reader.result)))
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsText(blob)
    })
    const exported = JSON.parse(json) as { issues: RedmineIssue[] }
    expect(exported.issues.map(({ id }) => id)).toEqual([971])
    expect(json).not.toContain('export-secret')
    expect(json).not.toContain('redmine.test')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:redmine-export')

    anchorClick.mockRestore()
    vi.unstubAllGlobals()
  })

  it('shows an understandable error when loading fails', async () => {
    mockedGetIssues.mockRejectedValue(new Error('Test error'))

    render(<Dashboard />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Die Ticketdaten konnten nicht geladen werden',
    )
  })
})
