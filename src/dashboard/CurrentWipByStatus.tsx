import type { Issue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import {
  calculateCurrentWipByStatus,
  type CurrentWipStatus,
} from '../domain/currentWipByStatus'
import type { ReferenceTime } from '../domain/statusDwellTime'

interface CurrentWipByStatusProps {
  readonly issues: readonly Issue[]
  readonly statusDefinitions: readonly StatusDefinition[]
  readonly referenceTime: ReferenceTime
}

export function CurrentWipByStatus({
  issues,
  statusDefinitions,
  referenceTime,
}: CurrentWipByStatusProps) {
  const statuses = calculateCurrentWipByStatus(
    issues,
    statusDefinitions,
    referenceTime,
  )

  return <CurrentWipStatusBars statuses={statuses} />
}

export function CurrentWipStatusBars({
  statuses,
}: {
  readonly statuses: readonly CurrentWipStatus[]
}) {
  if (statuses.length === 0) {
    return (
      <section
        className="current-wip-status"
        aria-labelledby="current-wip-status-title"
      >
        <h2 id="current-wip-status-title">Aktueller WIP nach Status</h2>
        <p className="dashboard-status">
          Aktuell befinden sich keine Tickets im Work in Progress.
        </p>
      </section>
    )
  }

  const maxCount = Math.max(...statuses.map((status) => status.issueCount))

  return (
    <section
      className="current-wip-status"
      aria-labelledby="current-wip-status-title"
    >
      <header className="section-header">
        <h2 id="current-wip-status-title">Aktueller WIP nach Status</h2>
        <p>Verteilung der laufenden Tickets auf die Prozessschritte</p>
      </header>

      <ul className="current-wip-status-list">
        {statuses.map((status) => (
          <li
            aria-label={`${status.statusName}: ${status.issueCount} ${status.issueCount === 1 ? 'Ticket' : 'Tickets'}`}
            key={status.statusId}
          >
            <span className="current-wip-status-name">{status.statusName}</span>
            <div className="current-wip-status-track" aria-hidden="true">
              <span
                className="current-wip-status-bar"
                style={{ width: `${(status.issueCount / maxCount) * 100}%` }}
              />
            </div>
            <strong>{status.issueCount}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}
