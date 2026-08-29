import type { Issue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import {
  calculateAggregatedStatusDwellTimes,
  type AggregatedStatusDwellTime,
} from '../domain/aggregatedStatusDwellTimes'
import type { ReferenceTime } from '../domain/statusDwellTime'

const DAY_MS = 24 * 60 * 60 * 1000

interface AggregatedStatusDwellTimesProps {
  readonly issues: readonly Issue[]
  readonly statusDefinitions: readonly StatusDefinition[]
  readonly referenceTime: ReferenceTime
}

export function AggregatedStatusDwellTimes({
  issues,
  statusDefinitions,
  referenceTime,
}: AggregatedStatusDwellTimesProps) {
  const statuses = calculateAggregatedStatusDwellTimes(
    issues,
    statusDefinitions,
    referenceTime,
  )

  return <AggregatedStatusDwellTimeBars statuses={statuses} />
}

export function AggregatedStatusDwellTimeBars({
  statuses,
}: {
  readonly statuses: readonly AggregatedStatusDwellTime[]
}) {
  if (statuses.length === 0) {
    return (
      <section
        className="aggregated-dwell-times"
        aria-labelledby="aggregated-dwell-times-title"
      >
        <h2 id="aggregated-dwell-times-title">
          Aggregierte Statusverweilzeiten
        </h2>
        <p className="dashboard-status">
          Keine verwertbaren Statusverweilzeiten verfügbar.
        </p>
      </section>
    )
  }

  const maxMedianMs = Math.max(
    1,
    ...statuses.map((status) => status.medianDurationMs),
  )

  return (
    <section
      className="aggregated-dwell-times"
      aria-labelledby="aggregated-dwell-times-title"
    >
      <header className="section-header">
        <h2 id="aggregated-dwell-times-title">
          Aggregierte Statusverweilzeiten
        </h2>
        <p>Typische Verweildauer je Prozessstatus</p>
      </header>

      <ul className="aggregated-dwell-list">
        {statuses.map((status) => {
          const statusName = status.statusName ?? 'Nicht bekannt'
          const median = formatDays(status.medianDurationMs)
          const average = formatDays(status.averageDurationMs)

          return (
            <li
              aria-label={`${statusName}: Median ${median}, Durchschnitt ${average}, ${status.dwellTimeCount} Verweilzeiten`}
              key={status.statusId}
            >
              <div className="aggregated-dwell-header">
                <strong>{statusName}</strong>
                <span>Median: {median}</span>
                <span>Durchschnitt: {average}</span>
                <span>Anzahl: {status.dwellTimeCount}</span>
              </div>
              <div className="aggregated-dwell-track" aria-hidden="true">
                <span
                  className="aggregated-dwell-bar"
                  style={{
                    width: `${(status.medianDurationMs / maxMedianMs) * 100}%`,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function formatDays(durationMs: number): string {
  return `${Number((durationMs / DAY_MS).toFixed(1))} d`
}
