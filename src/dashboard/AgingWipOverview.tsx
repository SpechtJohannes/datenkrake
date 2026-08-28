import type { Issue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import { calculateAgingWip, type AgingWipItem } from '../domain/agingWip'
import type { ReferenceTime } from '../domain/statusDwellTime'

interface AgingWipOverviewProps {
  issues: readonly Issue[]
  statusDefinitions: readonly StatusDefinition[]
  referenceTime: ReferenceTime
}

export function AgingWipOverview({
  issues,
  statusDefinitions,
  referenceTime,
}: AgingWipOverviewProps) {
  const items = calculateAgingWip(issues, statusDefinitions, referenceTime)

  return <AgingWipList items={items} />
}

export function AgingWipList({ items }: { items: readonly AgingWipItem[] }) {
  if (items.length === 0) {
    return (
      <section className="aging-wip" aria-labelledby="aging-wip-title">
        <h2 id="aging-wip-title">Aging WIP</h2>
        <p className="dashboard-status">
          Aktuell befinden sich keine laufenden Tickets im Aging WIP.
        </p>
      </section>
    )
  }

  const maxAgeMs = Math.max(1, ...items.map((item) => item.ageMs))

  return (
    <section className="aging-wip" aria-labelledby="aging-wip-title">
      <header className="section-header">
        <h2 id="aging-wip-title">Aging WIP</h2>
        <p>Laufende Cycle Times, ältestes Ticket zuerst</p>
      </header>

      <ol className="aging-wip-list">
        {items.map((item) => {
          const ageLabel = formatAgeDays(item.ageDays)
          return (
            <li
              aria-label={`Ticket #${item.issueId}: ${item.subject}, Status ${item.currentStatus}, bisheriges Alter ${ageLabel}`}
              key={item.issueId}
            >
              <div className="aging-wip-ticket">
                <span className="aging-wip-reference">#{item.issueId}</span>
                <strong>{item.subject}</strong>
                <span>{item.currentStatus}</span>
                <span className="aging-wip-age">{ageLabel}</span>
              </div>
              <div className="aging-wip-track" aria-hidden="true">
                <span
                  className="aging-wip-bar"
                  style={{ width: `${(item.ageMs / maxAgeMs) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function formatAgeDays(ageDays: number): string {
  const roundedDays = Number(ageDays.toFixed(1))
  return `${roundedDays} ${roundedDays === 1 ? 'Tag' : 'Tage'}`
}
