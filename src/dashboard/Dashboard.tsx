import { useEffect, useState } from 'react'
import { getIssues, type RedmineIssue } from '../data/issues'
import { DashboardSummary } from './DashboardSummary'
import { IssuePreview } from './IssuePreview'
import { StatusDwellTimePreview } from './StatusDwellTimePreview'

type DashboardState =
  | { status: 'loading' }
  | {
      status: 'success'
      issues: readonly RedmineIssue[]
      referenceTime: number
    }
  | { status: 'error' }

export function Dashboard() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })

  useEffect(() => {
    let isActive = true

    getIssues().then(
      (issues) => {
        if (isActive) {
          setState({ status: 'success', issues, referenceTime: Date.now() })
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
      <IssuePreview issues={state.issues} />
      <StatusDwellTimePreview
        issues={state.issues}
        referenceTime={state.referenceTime}
      />
    </section>
  )
}
