import type { CycleTimeMetrics } from '../domain/cycleTimeMetrics'
import { formatDurationMs } from '../domain/statusDwellTime'

interface CycleTimeSummaryProps {
  metrics: CycleTimeMetrics
}

export function CycleTimeSummary({ metrics }: CycleTimeSummaryProps) {
  const medianLabel =
    metrics.medianCompletedDurationMs === null
      ? 'Nicht verfügbar'
      : formatDurationMs(metrics.medianCompletedDurationMs)
  const p85Label =
    metrics.p85CompletedDurationMs === null
      ? 'Nicht verfügbar'
      : formatDurationMs(metrics.p85CompletedDurationMs)
  const p95Label =
    metrics.p95CompletedDurationMs === null
      ? 'Nicht verfügbar'
      : formatDurationMs(metrics.p95CompletedDurationMs)

  return (
    <section aria-labelledby="cycle-time-summary-title">
      <h2 id="cycle-time-summary-title">Cycle-Time-Übersicht</h2>
      <dl className="summary-grid cycle-time-summary">
        <div className="summary-card">
          <dt>Median Cycle Time</dt>
          <dd aria-label={`Median Cycle Time: ${medianLabel}`}>
            {medianLabel}
          </dd>
        </div>
        <div className="summary-card">
          <dt>P85 Cycle Time</dt>
          <dd aria-label={`P85 Cycle Time: ${p85Label}`}>{p85Label}</dd>
        </div>
        <div className="summary-card">
          <dt>P95 Cycle Time</dt>
          <dd aria-label={`P95 Cycle Time: ${p95Label}`}>{p95Label}</dd>
        </div>
        <div className="summary-card">
          <dt>Abgeschlossene Tickets</dt>
          <dd aria-label={`Abgeschlossene Tickets: ${metrics.completedCount}`}>
            {metrics.completedCount}
          </dd>
        </div>
        <div className="summary-card">
          <dt>Laufende Tickets</dt>
          <dd aria-label={`Laufende Tickets: ${metrics.runningCount}`}>
            {metrics.runningCount}
          </dd>
        </div>
      </dl>
    </section>
  )
}
