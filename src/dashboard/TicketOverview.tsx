import { useState } from 'react'
import type { RedmineIssue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import { calculateCycleTime, type CycleTimeResult } from '../domain/cycleTime'
import {
  calculateStatusDwellTimes,
  formatDurationMs,
  type ReferenceTime,
} from '../domain/statusDwellTime'
import { CycleTimeDetails } from './CycleTimeDetails'

interface TicketOverviewProps {
  issues: readonly RedmineIssue[]
  referenceTime: ReferenceTime
  statusDefinitions: readonly StatusDefinition[]
}

export function TicketOverview({
  issues,
  referenceTime,
  statusDefinitions,
}: TicketOverviewProps) {
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<number>>(
    () => new Set(),
  )

  function toggleIssue(issueId: number) {
    setExpandedIssueIds((current) => {
      const next = new Set(current)
      if (next.has(issueId)) next.delete(issueId)
      else next.add(issueId)
      return next
    })
  }

  return (
    <section className="ticket-overview" aria-labelledby="tickets-title">
      <header className="section-header">
        <h2 id="tickets-title">Tickets</h2>
        <p>{issues.length} geladene Tickets – Details bei Bedarf aufklappen</p>
      </header>

      <div className="ticket-list">
        {issues.map((issue) => {
          const cycleTime = calculateCycleTime(
            issue,
            statusDefinitions,
            referenceTime,
          )
          const isExpanded = expandedIssueIds.has(issue.id)
          const detailsId = `ticket-details-${issue.id}`

          return (
            <article className="ticket-card" key={issue.id}>
              <button
                className="ticket-summary"
                aria-controls={detailsId}
                aria-expanded={isExpanded}
                aria-label={`Ticket #${issue.id}: ${issue.subject}. Aktueller Status: ${issue.status.name}. Cycle Time Status: ${getCycleTimeStatus(cycleTime)}. Cycle Time Dauer: ${getCycleTimeDuration(cycleTime)}`}
                onClick={() => toggleIssue(issue.id)}
                type="button"
              >
                <span className="ticket-reference">#{issue.id}</span>
                <strong className="ticket-subject">{issue.subject}</strong>
                <TicketSummaryValue
                  label="Aktueller Status"
                  value={issue.status.name}
                />
                <TicketSummaryValue
                  label="Cycle Time Status"
                  value={getCycleTimeStatus(cycleTime)}
                />
                <TicketSummaryValue
                  label="Cycle Time Dauer"
                  value={getCycleTimeDuration(cycleTime)}
                />
                <span className="ticket-toggle" aria-hidden="true">
                  {isExpanded ? '−' : '+'}
                </span>
              </button>

              {isExpanded && (
                <TicketDetails
                  cycleTime={cycleTime}
                  detailsId={detailsId}
                  issue={issue}
                  referenceTime={referenceTime}
                  statusDefinitions={statusDefinitions}
                />
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

interface TicketSummaryValueProps {
  label: string
  value: string
}

function TicketSummaryValue({ label, value }: TicketSummaryValueProps) {
  return (
    <span className="ticket-summary-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  )
}

interface TicketDetailsProps {
  cycleTime: CycleTimeResult | null
  detailsId: string
  issue: RedmineIssue
  referenceTime: ReferenceTime
  statusDefinitions: readonly StatusDefinition[]
}

function TicketDetails({
  cycleTime,
  detailsId,
  issue,
  referenceTime,
  statusDefinitions,
}: TicketDetailsProps) {
  const dwellTimes = calculateStatusDwellTimes(
    issue,
    referenceTime,
    statusDefinitions,
  )

  return (
    <div className="ticket-details" id={detailsId}>
      <CycleTimeDetails cycleTime={cycleTime} issueId={issue.id} />

      <div className="table-scroll">
        <table>
          <caption>Statusverweilzeiten für Issue #{issue.id}</caption>
          <thead>
            <tr>
              <th scope="col">Status-ID</th>
              <th scope="col">Statusname</th>
              <th scope="col">Gesamtverweilzeit</th>
              <th scope="col">Aufenthalte</th>
              <th scope="col">Aktueller Status</th>
            </tr>
          </thead>
          <tbody>
            {dwellTimes.map((dwellTime) => (
              <tr key={dwellTime.statusId}>
                <td>{dwellTime.statusId}</td>
                <td>{dwellTime.statusName ?? 'Nicht bekannt'}</td>
                <td>{formatDurationMs(dwellTime.totalDurationMs)}</td>
                <td>{dwellTime.visitCount}</td>
                <td>{dwellTime.isCurrent ? 'Aktuell' : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getCycleTimeStatus(cycleTime: CycleTimeResult | null): string {
  if (cycleTime === null) return 'Noch nicht gestartet'
  return cycleTime.isRunning ? 'Läuft' : 'Abgeschlossen'
}

function getCycleTimeDuration(cycleTime: CycleTimeResult | null): string {
  return cycleTime?.durationMs === null || cycleTime?.durationMs === undefined
    ? 'Nicht verfügbar'
    : formatDurationMs(cycleTime.durationMs)
}
