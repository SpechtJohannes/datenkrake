import { useEffect, useState } from 'react'
import { getIssues, type RedmineIssue } from '../data/issues'
import { getStatuses, type StatusDefinition } from '../data/statusDefinitions'
import { DashboardSummary } from './DashboardSummary'
import { CycleTimeOverview } from './CycleTimeOverview'
import { IssuePreview } from './IssuePreview'
import { StatusDwellTimePreview } from './StatusDwellTimePreview'

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

  return (
    <section aria-label="Dashboard-Übersicht">
      <DashboardSummary issues={state.issues} />
      <CycleTimeOverview
        issues={state.issues}
        statusDefinitions={state.statusDefinitions}
        referenceTime={state.referenceTime}
      />
      <IssuePreview issues={state.issues} />
      <StatusDwellTimePreview
        issues={state.issues}
        referenceTime={state.referenceTime}
        statusDefinitions={state.statusDefinitions}
      />
    </section>
  )
}
