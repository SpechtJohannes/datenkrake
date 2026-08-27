import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RedmineIssue } from '../data/types'
import {
  RedmineApiError,
  type RedmineErrorKind,
} from '../redmine/redmineClient'
import { DataImportPanel } from './DataImportPanel'

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

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('DataImportPanel Redmine source', () => {
  it('shows fields for base URL, password API key, and query parameters', () => {
    render(
      <DataImportPanel
        issues={[issue(1)]}
        onImport={vi.fn()}
        onLoadRedmine={vi.fn()}
        source={{ kind: 'mock' }}
      />,
    )

    expect(screen.getByLabelText('Redmine Basis-URL')).toHaveAttribute(
      'type',
      'url',
    )
    expect(screen.getByLabelText('Redmine API-Key')).toHaveAttribute(
      'type',
      'password',
    )
    expect(screen.getByLabelText('Query-Parameter')).toHaveAttribute(
      'type',
      'text',
    )
    expect(
      screen.getByRole('button', { name: 'Issues aus Redmine laden' }),
    ).toBeVisible()
  })

  it('forwards configuration and query values and disables duplicate loading', async () => {
    const user = userEvent.setup()
    const pending = deferred()
    const onLoadRedmine = vi.fn(() => pending.promise)
    render(
      <DataImportPanel
        issues={[issue(1)]}
        onImport={vi.fn()}
        onLoadRedmine={onLoadRedmine}
        source={{ kind: 'mock' }}
      />,
    )

    await user.type(
      screen.getByLabelText('Redmine Basis-URL'),
      'https://redmine.test',
    )
    await user.type(screen.getByLabelText('Redmine API-Key'), 'secret-key')
    await user.type(
      screen.getByLabelText('Query-Parameter'),
      'project_id=12&status_id=*&status_id=5',
    )
    await user.click(
      screen.getByRole('button', { name: 'Issues aus Redmine laden' }),
    )

    expect(onLoadRedmine).toHaveBeenCalledWith({
      baseUrl: 'https://redmine.test',
      apiKey: 'secret-key',
      query: { project_id: '12', status_id: ['*', '5'] },
    })
    expect(
      screen.getByRole('button', { name: 'Redmine wird geladen …' }),
    ).toBeDisabled()
    pending.resolve()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Issues aus Redmine laden' }),
      ).toBeEnabled(),
    )
    expect(screen.getByLabelText('Redmine API-Key')).toHaveValue('')
  })

  it.each([
    ['unauthorized', 401, 'Redmine-Anmeldung ist fehlgeschlagen'],
    ['forbidden', 403, 'Zugriff auf die angefragten Issues verweigert'],
    ['network', undefined, 'nicht erreichbar'],
    ['http', 500, 'technischen Fehlers'],
  ] as const)(
    'shows a safe %s error and retains the active source',
    async (kind, status, message) => {
      const user = userEvent.setup()
      const error = new RedmineApiError(
        'internal error',
        kind as RedmineErrorKind,
        status,
      )
      render(
        <DataImportPanel
          issues={[issue(91)]}
          onImport={vi.fn()}
          onLoadRedmine={vi.fn().mockRejectedValue(error)}
          source={{ kind: 'import', fileName: 'active.json' }}
        />,
      )

      await user.type(
        screen.getByLabelText('Redmine Basis-URL'),
        'https://redmine.test',
      )
      await user.type(screen.getByLabelText('Redmine API-Key'), 'secret-key')
      await user.click(
        screen.getByRole('button', { name: 'Issues aus Redmine laden' }),
      )

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(screen.getByRole('alert')).not.toHaveTextContent('internal error')
      expect(screen.getByText('active.json')).toBeVisible()
      expect(
        screen.getByText('Datenquelle: Importierte JSON-Datei · 1 Issue'),
      ).toBeVisible()
      expect(screen.getByLabelText('Redmine API-Key')).toHaveValue('')
    },
  )
})
