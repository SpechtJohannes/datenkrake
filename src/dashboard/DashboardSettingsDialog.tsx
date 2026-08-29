import { useEffect, useRef } from 'react'
import {
  DASHBOARD_SECTIONS,
  type DashboardSectionId,
  type DashboardVisibility,
} from './dashboardVisibility'

interface DashboardSettingsDialogProps {
  readonly visibility: DashboardVisibility
  readonly onChange: (sectionId: DashboardSectionId, visible: boolean) => void
  readonly onClose: () => void
  readonly onReset: () => void
}

export function DashboardSettingsDialog({
  visibility,
  onChange,
  onClose,
  onReset,
}: DashboardSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return

    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    dialog.focus()

    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
    }
  }, [])

  return (
    <div className="dashboard-dialog-backdrop">
      <dialog
        className="dashboard-dialog"
        aria-labelledby="dashboard-dialog-title"
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault()
          onClose()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
        }}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="dashboard-dialog-header">
          <div>
            <h2 id="dashboard-dialog-title">Dashboard anpassen</h2>
            <p>Sichtbare Dashboard-Bereiche auswählen</p>
          </div>
          <button aria-label="Dialog schließen" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <fieldset className="dashboard-section-options">
          <legend>Dashboard-Bereiche</legend>
          {DASHBOARD_SECTIONS.map((section) => (
            <label key={section.id}>
              <input
                checked={visibility[section.id]}
                onChange={(event) =>
                  onChange(section.id, event.currentTarget.checked)
                }
                type="checkbox"
              />
              <span>{section.label}</span>
            </label>
          ))}
        </fieldset>

        <footer className="dashboard-dialog-actions">
          <button className="secondary-button" onClick={onReset} type="button">
            Standard wiederherstellen
          </button>
          <button className="primary-button" onClick={onClose} type="button">
            Schließen
          </button>
        </footer>
      </dialog>
    </div>
  )
}
