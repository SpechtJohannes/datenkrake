import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RedmineIssue } from '../data/types'
import {
  createDataExport,
  createDataExportFileName,
  serializeDataExport,
} from '../export/dataExport'
import { DataImportPanel } from './DataImportPanel'

vi.mock('../export/dataExport', () => ({
  DATA_EXPORT_FORMAT: 'datenkrake',
  DATA_EXPORT_VERSION: 3,
  createDataExport: vi.fn(),
  createDataExportFileName: vi.fn(),
  serializeDataExport: vi.fn(),
}))

const mockedCreateDataExport = vi.mocked(createDataExport)
const mockedSerializeDataExport = vi.mocked(serializeDataExport)
const mockedCreateFileName = vi.mocked(createDataExportFileName)

function issue(id: number): RedmineIssue {
  const reference = { id: 1, name: 'Example' }
  return {
    id,
    project: reference,
    tracker: reference,
    status: { ...reference, is_closed: false },
    priority: reference,
    author: reference,
    subject: `Issue ${id}`,
    description: 'Description',
    created_on: '2026-08-01T08:00:00Z',
    updated_on: '2026-08-02T08:00:00Z',
    closed_on: null,
    journals: [],
  }
}

describe('DataImportPanel export', () => {
  const createObjectURL = vi.fn((blob: Blob) => {
    void blob
    return 'blob:download'
  })
  const revokeObjectURL = vi.fn()
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click')

  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    mockedCreateDataExport.mockReset()
    mockedSerializeDataExport.mockReset()
    mockedCreateFileName.mockReset()
    createObjectURL.mockReset().mockReturnValue('blob:download')
    revokeObjectURL.mockReset()
    anchorClick.mockReset().mockImplementation(() => undefined)
    mockedCreateDataExport.mockReturnValue({
      format: 'datenkrake',
      version: 3,
      exportedAt: '2026-08-27T14:15:16.000Z',
      statusDefinitions: [],
      issues: [],
    })
    mockedSerializeDataExport.mockReturnValue('{"format":"datenkrake"}')
    mockedCreateFileName.mockReturnValue('datenkrake_2026_08_27.json')
  })

  afterAll(() => {
    vi.unstubAllGlobals()
    anchorClick.mockRestore()
  })

  it('shows an accessible export action', () => {
    render(
      <DataImportPanel
        issues={[issue(1)]}
        onImport={vi.fn()}
        onLoadRedmine={vi.fn()}
        source={{ kind: 'mock' }}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'JSON-Datei speichern' }),
    ).toBeVisible()
  })

  it('exports the current mock issues through the existing export functions', async () => {
    const user = userEvent.setup()
    const currentIssues = [issue(1), issue(2)]
    render(
      <DataImportPanel
        issues={currentIssues}
        onImport={vi.fn()}
        onLoadRedmine={vi.fn()}
        source={{ kind: 'mock' }}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'JSON-Datei speichern' }),
    )

    expect(mockedCreateDataExport).toHaveBeenCalledWith(
      { issues: currentIssues, statusDefinitions: [] },
      expect.any(Date),
    )
    const exportedAt = mockedCreateDataExport.mock.calls[0][1]
    expect(exportedAt).toBeInstanceOf(Date)
    expect(mockedSerializeDataExport).toHaveBeenCalledWith(
      mockedCreateDataExport.mock.results[0].value,
    )
    expect(mockedCreateFileName).toHaveBeenCalledWith(exportedAt)
  })

  it('exports exactly a previously imported issue collection', async () => {
    const user = userEvent.setup()
    const importedIssues = [issue(91)]
    render(
      <DataImportPanel
        issues={importedIssues}
        onImport={vi.fn()}
        onLoadRedmine={vi.fn()}
        source={{ kind: 'import', fileName: 'import.json' }}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'JSON-Datei speichern' }),
    )

    expect(mockedCreateDataExport.mock.calls[0][0]).toEqual({
      issues: importedIssues,
      statusDefinitions: [],
    })
    expect(mockedCreateDataExport).toHaveBeenCalledOnce()
  })

  it('creates a JSON blob, triggers the named download, and releases all resources', async () => {
    const user = userEvent.setup()
    render(
      <DataImportPanel
        issues={[issue(1)]}
        onImport={vi.fn()}
        onLoadRedmine={vi.fn()}
        source={{ kind: 'mock' }}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'JSON-Datei speichern' }),
    )

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob).toMatchObject({ type: 'application/json' })
    expect(anchorClick).toHaveBeenCalledOnce()
    const anchor = anchorClick.mock.instances[0] as HTMLAnchorElement
    expect(anchor.href).toBe('blob:download')
    expect(anchor.download).toBe('datenkrake_2026_08_27.json')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download')
    expect(document.body.contains(anchor)).toBe(false)
  })

  it('shows a safe error and still cleans up when file creation fails', async () => {
    const user = userEvent.setup()
    createObjectURL.mockImplementation(() => {
      throw new Error('technical details')
    })
    render(
      <DataImportPanel
        issues={[issue(1)]}
        onImport={vi.fn()}
        onLoadRedmine={vi.fn()}
        source={{ kind: 'mock' }}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'JSON-Datei speichern' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Die JSON-Datei konnte nicht erstellt werden',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('technical details')
    expect(anchorClick).not.toHaveBeenCalled()
    expect(document.querySelector('a[download]')).not.toBeInTheDocument()
  })
})
