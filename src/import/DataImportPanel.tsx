import { useState, type ChangeEvent } from 'react'
import type { RedmineIssue } from '../data/types'
import { DataImportError, parseDataImport } from './dataImport'

export type ActiveDataSource =
  { kind: 'mock' } | { kind: 'import'; fileName: string }

interface DataImportPanelProps {
  issueCount: number
  source: ActiveDataSource
  onImport: (issues: readonly RedmineIssue[], fileName: string) => void
}

function getImportErrorMessage(error: unknown): string {
  if (!(error instanceof DataImportError)) {
    return 'Die Datei konnte nicht lokal gelesen werden.'
  }

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

export function DataImportPanel({
  issueCount,
  source,
  onImport,
}: DataImportPanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)

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

  return (
    <section className="data-import-panel" aria-labelledby="data-import-title">
      <div>
        <p className="eyebrow">Aktiver Datenbestand</p>
        <h2 id="data-import-title">
          {source.kind === 'mock' ? 'Mockdaten' : source.fileName}
        </h2>
        <p className="data-source-summary">
          Datenquelle:{' '}
          {source.kind === 'mock' ? 'Mockdaten' : 'Importierte JSON-Datei'} ·{' '}
          {issueCount} {issueCount === 1 ? 'Issue' : 'Issues'}
        </p>
      </div>

      <label className="primary-button data-import-button">
        {isReading ? 'Datei wird gelesen …' : 'JSON-Datei auswählen'}
        <input
          accept="application/json,.json"
          disabled={isReading}
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {errorMessage !== null && (
        <p className="data-import-error" role="alert">
          {errorMessage} Der bisherige Datenbestand bleibt aktiv.
        </p>
      )}
    </section>
  )
}
