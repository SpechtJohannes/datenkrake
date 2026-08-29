import { useEffect, useRef, useState } from 'react'
import { getIssues, type Issue } from '../data/issues'
import { getStatuses, type StatusDefinition } from '../data/statusDefinitions'
import {
  DataImportPanel,
  type ActiveDataSource,
} from '../import/DataImportPanel'
import {
  loadRedmineIssues,
  type RedmineLoadRequest,
} from '../redmine/loadRedmineIssues'
import { DashboardSummary } from './DashboardSummary'
import { AgingWipOverview } from './AgingWipOverview'
import { AggregatedStatusDwellTimes } from './AggregatedStatusDwellTimes'
import { DashboardSettingsDialog } from './DashboardSettingsDialog'
import { CycleTimeOverview } from './CycleTimeOverview'
import { CurrentWipByStatus } from './CurrentWipByStatus'
import { TicketOverview } from './TicketOverview'
import { ThroughputOverview } from './ThroughputOverview'
import { ThroughputDistribution } from './ThroughputDistribution'
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
      issues: readonly Issue[]
      source: ActiveDataSource
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
            source: { kind: 'mock' },
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
    return <output className="dashboard-status">Issues werden geladen …</output>
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

  function useImportedIssues(issues: readonly Issue[], fileName: string) {
    setState((current) =>
      current.status === 'success'
        ? {
            ...current,
            issues,
            source: { kind: 'import', fileName },
            referenceTime: Date.now(),
          }
        : current,
    )
  }

  async function useRedmineIssues(request: RedmineLoadRequest) {
    const issues = await loadRedmineIssues(request)
    setState((current) =>
      current.status === 'success'
        ? {
            ...current,
            issues,
            source: { kind: 'redmine' },
            referenceTime: Date.now(),
          }
        : current,
    )
  }

  const hasVisibleSection = DASHBOARD_SECTIONS.some(
    (section) => visibility[section.id],
  )

  return (
    <section aria-label="Dashboard-Übersicht">
      <DataImportPanel
        issues={state.issues}
        onImport={useImportedIssues}
        onLoadRedmine={useRedmineIssues}
        source={state.source}
      />

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
        <output className="dashboard-status">
          Aktuell sind keine Dashboard-Bereiche ausgewählt. Über „Dashboard
          anpassen“ können Bereiche wieder eingeblendet werden.
        </output>
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
      {visibility.throughputDistribution && (
        <ThroughputDistribution
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
