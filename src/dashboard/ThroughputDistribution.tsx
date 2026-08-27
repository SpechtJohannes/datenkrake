import type { RedmineIssue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import {
  calculateThroughputDistribution,
  type ThroughputDistribution as ThroughputDistributionResult,
} from '../domain/throughputDistribution'

interface ThroughputDistributionProps {
  issues: readonly RedmineIssue[]
  statusDefinitions: readonly StatusDefinition[]
}

export function ThroughputDistribution({
  issues,
  statusDefinitions,
}: ThroughputDistributionProps) {
  const distribution = calculateThroughputDistribution(
    issues,
    statusDefinitions,
  )

  return <ThroughputDistributionChart distribution={distribution} />
}

export function ThroughputDistributionChart({
  distribution,
}: {
  distribution: ThroughputDistributionResult
}) {
  if (distribution.weeks.length === 0) {
    return (
      <section
        className="throughput-distribution"
        aria-labelledby="throughput-distribution-title"
      >
        <h2 id="throughput-distribution-title">Throughput Verteilung</h2>
        <p className="dashboard-status">
          Keine abgeschlossenen Tickets für die Throughput-Verteilung verfügbar.
        </p>
      </section>
    )
  }

  const maxCount = Math.max(
    1,
    ...distribution.weeks.map((week) => week.completedCount),
  )

  return (
    <section
      className="throughput-distribution"
      aria-labelledby="throughput-distribution-title"
    >
      <header className="section-header">
        <h2 id="throughput-distribution-title">Throughput Verteilung</h2>
        <p>Schwankung der abgeschlossenen Tickets pro ISO-Kalenderwoche</p>
      </header>

      <dl className="throughput-distribution-metrics">
        <div>
          <dt>Betrachtete Wochen</dt>
          <dd>{distribution.weekCount}</dd>
        </div>
        <div>
          <dt>Gesamter Throughput</dt>
          <dd>{distribution.totalThroughput}</dd>
        </div>
        <div>
          <dt>Durchschnitt pro Woche</dt>
          <dd>{formatTicketCount(distribution.averageThroughput)}</dd>
        </div>
        <div>
          <dt>Median pro Woche</dt>
          <dd>{formatTicketCount(distribution.medianThroughput)}</dd>
        </div>
      </dl>

      <div className="throughput-distribution-scroll">
        <ul className="throughput-distribution-list">
          {distribution.weeks.map((week) => {
            const label = `KW ${week.isoWeek} / ${week.isoWeekYear}`
            return (
              <li
                aria-label={`${label}: ${week.completedCount} abgeschlossene Tickets`}
                key={`${week.isoWeekYear}-${week.isoWeek}`}
              >
                <span>{label}</span>
                <div
                  className="throughput-distribution-track"
                  aria-hidden="true"
                >
                  <span
                    className={`throughput-distribution-bar${week.completedCount === 0 ? ' throughput-distribution-bar-zero' : ''}`}
                    style={{
                      width: `${(week.completedCount / maxCount) * 100}%`,
                    }}
                  />
                </div>
                <strong>{week.completedCount}</strong>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function formatTicketCount(value: number | null): string {
  return value === null
    ? 'Nicht verfügbar'
    : Number(value.toFixed(1)).toString()
}
