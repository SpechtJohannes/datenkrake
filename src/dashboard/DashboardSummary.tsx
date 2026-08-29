import type { Issue } from '../data/issues'

interface DashboardSummaryProps {
  readonly issues: readonly Issue[]
}

export function DashboardSummary({ issues }: DashboardSummaryProps) {
  const statusCount = new Set(issues.map((issue) => issue.status.id)).size
  const issuesWithJournals = issues.filter(
    (issue) => issue.journals.length > 0,
  ).length

  return (
    <dl className="summary-grid" aria-label="Ticket-Kennzahlen">
      <div className="summary-card">
        <dt>Geladene Issues</dt>
        <dd aria-label={`Geladene Issues: ${issues.length}`}>
          {issues.length}
        </dd>
      </div>
      <div className="summary-card">
        <dt>Unterschiedliche Status</dt>
        <dd aria-label={`Unterschiedliche Status: ${statusCount}`}>
          {statusCount}
        </dd>
      </div>
      <div className="summary-card">
        <dt>Issues mit Journaleinträgen</dt>
        <dd aria-label={`Issues mit Journaleinträgen: ${issuesWithJournals}`}>
          {issuesWithJournals}
        </dd>
      </div>
    </dl>
  )
}
