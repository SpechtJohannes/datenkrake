import { useEffect, useRef, useState } from 'react'
import { getIssues, type RedmineIssue } from '../data/issues'
import { getStatuses, type StatusDefinition } from '../data/statusDefinitions'
import { DashboardSummary } from './DashboardSummary'
import { AgingWipOverview } from './AgingWipOverview'
import { AggregatedStatusDwellTimes } from './AggregatedStatusDwellTimes'
import { DashboardSettingsDialog } from './DashboardSettingsDialog'
import { CycleTimeOverview } from './CycleTimeOverview'
import { CurrentWipByStatus } from './CurrentWipByStatus'
import { TicketOverview } from './TicketOverview'
import { ThroughputOverview } from './ThroughputOverview'
import { WipOverview } from './WipOverview'
import {
  createDefaultVisibility,
  DASHBOARD_SECTIONS,
  loadDashboardVisibility,
  saveDashboardVisibility,
  type DashboardSectionId,
} from './dashboardVisibility'

type DashboardState =
  | { status: 'loading' }
  | {
      status: 'success'
      issues: readonly RedmineIssue[]
      statusDefinitions: readonly StatusDefinition[]
      referenceTime: number
    }
  | { status: 'error' }

export function Dashboard() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })
  const [visibility, setVisibility] = useState(loadDashboardVisibility)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let isActive = true

    Promise.all([getIssues(), getStatuses()]).then(
      ([issues, statusDefinitions]) => {
        if (isActive) {
          setState({
            status: 'success',
            issues,
            statusDefinitions,
            referenceTime: Date.now(),
          })
        }
      },
      () => {
        if (isActive) {
          setState({ status: 'error' })
        }
      },
    )

    return () => {
      isActive = false
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <p className="dashboard-status" role="status">
        Issues werden geladen …
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <p className="dashboard-status dashboard-error" role="alert">
        Die Ticketdaten konnten nicht geladen werden. Bitte versuche es später
        erneut.
      </p>
    )
  }

  function updateVisibility(sectionId: DashboardSectionId, visible: boolean) {
    setVisibility((current) => {
      const next = { ...current, [sectionId]: visible }
      saveDashboardVisibility(next)
      return next
    })
  }

  function resetVisibility() {
    const next = createDefaultVisibility()
    saveDashboardVisibility(next)
    setVisibility(next)
  }

  function closeSettings() {
    setIsSettingsOpen(false)
    settingsButtonRef.current?.focus()
  }

  const hasVisibleSection = DASHBOARD_SECTIONS.some(
    (section) => visibility[section.id],
  )

  return (
    <section aria-label="Dashboard-Übersicht">
      <div className="dashboard-toolbar">
        <button
          className="secondary-button"
          onClick={() => setIsSettingsOpen(true)}
          ref={settingsButtonRef}
          type="button"
        >
          Dashboard anpassen
        </button>
      </div>

      {isSettingsOpen && (
        <DashboardSettingsDialog
          onChange={updateVisibility}
          onClose={closeSettings}
          onReset={resetVisibility}
          visibility={visibility}
        />
      )}

      {!hasVisibleSection && (
        <p className="dashboard-status" role="status">
          Aktuell sind keine Dashboard-Bereiche ausgewählt. Über „Dashboard
          anpassen“ können Bereiche wieder eingeblendet werden.
        </p>
      )}

      {visibility.summary && <DashboardSummary issues={state.issues} />}
      <CycleTimeOverview
        issues={state.issues}
        statusDefinitions={state.statusDefinitions}
        referenceTime={state.referenceTime}
        showDistribution={visibility.cycleTimeDistribution}
        showSummary={visibility.cycleTimeSummary}
        showTrend={visibility.cycleTimeTrend}
      />
      {visibility.throughput && (
        <ThroughputOverview
          issues={state.issues}
          statusDefinitions={state.statusDefinitions}
        />
      )}
      {visibility.wip && (
        <WipOverview
          issues={state.issues}
          statusDefinitions={state.statusDefinitions}
          referenceTime={state.referenceTime}
        />
      )}
      {visibility.agingWip && (
        <AgingWipOverview
          issues={state.issues}
          statusDefinitions={state.statusDefinitions}
          referenceTime={state.referenceTime}
        />
      )}
      {visibility.currentWipByStatus && (
        <CurrentWipByStatus
          issues={state.issues}
          statusDefinitions={state.statusDefinitions}
          referenceTime={state.referenceTime}
        />
      )}
      {visibility.aggregatedStatusDwellTimes && (
        <AggregatedStatusDwellTimes
          issues={state.issues}
          statusDefinitions={state.statusDefinitions}
          referenceTime={state.referenceTime}
        />
      )}
      {visibility.tickets && (
        <TicketOverview
          issues={state.issues}
          referenceTime={state.referenceTime}
          statusDefinitions={state.statusDefinitions}
        />
      )}
    </section>
  )
}
