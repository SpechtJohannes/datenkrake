import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { Issue } from '../data/types'
import {
  createDataExport,
  createDataExportFileName,
  serializeDataExport,
} from '../export/dataExport'
import { RedmineApiError } from '../redmine/redmineClient'
import { RedmineBaseUrlError } from '../redmine/redmineBaseUrl'
import type { RedmineLoadRequest } from '../redmine/loadRedmineIssues'
import type { RedmineIssueQuery, RedmineQueryValue } from '../redmine/types'
import { DataImportError, parseDataImport } from './dataImport'

export type ActiveDataSource =
  { kind: 'mock' } | { kind: 'import'; fileName: string } | { kind: 'redmine' }

interface DataImportPanelProps {
  readonly issues: readonly Issue[]
  readonly source: ActiveDataSource
  readonly onImport: (issues: readonly Issue[], fileName: string) => void
  readonly onLoadRedmine: (request: RedmineLoadRequest) => Promise<void>
}

function getSourceLabel(source: ActiveDataSource): string {
  if (source.kind === 'mock') return 'Mockdaten'
  if (source.kind === 'redmine') return 'Redmine'
  return 'Importierte JSON-Datei'
}

function getSourceTitle(source: ActiveDataSource): string {
  return source.kind === 'import' ? source.fileName : getSourceLabel(source)
}

function getImportErrorMessage(error: unknown): string {
  if (!(error instanceof DataImportError))
    return 'Die Datei konnte nicht lokal gelesen werden.'
  switch (error.kind) {
    case 'invalid-json':
      return 'Die ausgewählte Datei enthält kein gültiges JSON.'
    case 'missing-format':
    case 'invalid-format':
      return 'Die Datei ist kein gültiger Datenkrake-Export.'
    case 'missing-version':
    case 'unsupported-version':
      return 'Die Version dieser Datenkrake-Datei wird nicht unterstützt.'
    default:
      return 'Die Datenstruktur der ausgewählten Datei ist ungültig.'
  }
}

function getRedmineErrorMessage(error: unknown): string {
  if (error instanceof RedmineBaseUrlError) return error.message
  if (!(error instanceof RedmineApiError)) {
    return 'Die Redmine-Daten konnten wegen eines technischen Fehlers nicht geladen werden.'
  }
  switch (error.kind) {
    case 'network':
      return 'Redmine ist nicht erreichbar. Möglicherweise blockiert die Instanz den direkten Browserzugriff (CORS).'
    case 'unauthorized':
      return 'Die Redmine-Anmeldung ist fehlgeschlagen. Bitte prüfe den API-Key.'
    case 'forbidden':
      return 'Redmine hat den Zugriff auf die angefragten Issues verweigert.'
    default:
      return 'Die Redmine-Daten konnten wegen eines technischen Fehlers nicht geladen werden.'
  }
}

function addQueryValue(
  query: Record<string, RedmineQueryValue | RedmineQueryValue[]>,
  key: string,
  value: string,
): void {
  const existing = query[key]
  if (existing === undefined) query[key] = value
  else if (Array.isArray(existing)) existing.push(value)
  else query[key] = [existing, value]
}

function parseQueryParameters(value: string): RedmineIssueQuery {
  if (value.trim() === '') return {}
  const query: Record<string, RedmineQueryValue | RedmineQueryValue[]> = {}
  for (const [key, parameterValue] of new URLSearchParams(value)) {
    if (key.trim() === '') throw new Error('invalid-query')
    addQueryValue(query, key, parameterValue)
  }
  return query
}

export function DataImportPanel({
  issues,
  source,
  onImport,
  onLoadRedmine,
}: DataImportPanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(
    null,
  )
  const [redmineErrorMessage, setRedmineErrorMessage] = useState<string | null>(
    null,
  )
  const [isReading, setIsReading] = useState(false)
  const [isLoadingRedmine, setIsLoadingRedmine] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [queryParameters, setQueryParameters] = useState('')

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (file === undefined) return
    setIsReading(true)
    try {
      const result = parseDataImport(await file.text())
      onImport(result.issues, file.name)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(getImportErrorMessage(error))
    } finally {
      setIsReading(false)
      input.value = ''
    }
  }

  function handleExport() {
    const exportedAt = new Date()
    let objectUrl: string | undefined
    let downloadLink: HTMLAnchorElement | undefined
    try {
      const dataExport = createDataExport(issues, exportedAt)
      const blob = new Blob([serializeDataExport(dataExport)], {
        type: 'application/json',
      })
      objectUrl = URL.createObjectURL(blob)
      downloadLink = document.createElement('a')
      downloadLink.href = objectUrl
      downloadLink.download = createDataExportFileName(exportedAt)
      document.body.append(downloadLink)
      downloadLink.click()
      setExportErrorMessage(null)
    } catch {
      setExportErrorMessage('Die JSON-Datei konnte nicht erstellt werden.')
    } finally {
      downloadLink?.remove()
      if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl)
    }
  }

  async function handleRedmineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoadingRedmine(true)
    try {
      await onLoadRedmine({
        baseUrl,
        apiKey,
        query: parseQueryParameters(queryParameters),
      })
      setRedmineErrorMessage(null)
    } catch (error) {
      setRedmineErrorMessage(getRedmineErrorMessage(error))
    } finally {
      setApiKey('')
      setIsLoadingRedmine(false)
    }
  }

  return (
    <section className="data-import-panel" aria-labelledby="data-import-title">
      <div>
        <p className="eyebrow">Aktiver Datenbestand</p>
        <h2 id="data-import-title">{getSourceTitle(source)}</h2>
        <p className="data-source-summary">
          Datenquelle: {getSourceLabel(source)} · {issues.length}{' '}
          {issues.length === 1 ? 'Issue' : 'Issues'}
        </p>
      </div>
      <div className="data-actions">
        <button
          className="secondary-button"
          onClick={handleExport}
          type="button"
        >
          JSON-Datei speichern
        </button>
        <label className="primary-button data-import-button">
          {isReading ? 'Datei wird gelesen …' : 'JSON-Datei auswählen'}
          <input
            accept="application/json,.json"
            disabled={isReading}
            onChange={handleFileChange}
            type="file"
          />
        </label>
      </div>
      {errorMessage !== null && (
        <p className="data-import-error" role="alert">
          {errorMessage} Der bisherige Datenbestand bleibt aktiv.
        </p>
      )}
      {exportErrorMessage !== null && (
        <p className="data-import-error" role="alert">
          {exportErrorMessage} Bitte versuche es erneut.
        </p>
      )}

      <form className="redmine-source-form" onSubmit={handleRedmineSubmit}>
        <h3>Direkt aus Redmine laden</h3>
        <label>
          Redmine Basis-URL
          <input
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://redmine.example.com"
            required
            type="url"
            value={baseUrl}
          />
        </label>
        <label>
          Redmine API-Key
          <input
            autoComplete="off"
            onChange={(event) => setApiKey(event.target.value)}
            required
            type="password"
            value={apiKey}
          />
        </label>
        <label>
          Query-Parameter
          <input
            onChange={(event) => setQueryParameters(event.target.value)}
            placeholder="project_id=12&status_id=*"
            type="text"
            value={queryParameters}
          />
        </label>
        <button
          className="secondary-button"
          disabled={isLoadingRedmine}
          type="submit"
        >
          {isLoadingRedmine
            ? 'Redmine wird geladen …'
            : 'Issues aus Redmine laden'}
        </button>
      </form>
      {redmineErrorMessage !== null && (
        <p className="data-import-error" role="alert">
          {redmineErrorMessage} Der bisherige Datenbestand bleibt aktiv.
        </p>
      )}
    </section>
  )
}
