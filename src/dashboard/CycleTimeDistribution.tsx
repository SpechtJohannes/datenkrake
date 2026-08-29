import type { CycleTimeHistogram } from '../domain/cycleTimeHistogram'
import type { CycleTimeMetrics } from '../domain/cycleTimeMetrics'
import { formatDurationMs } from '../domain/statusDwellTime'

interface CycleTimeDistributionProps {
  readonly histogram: CycleTimeHistogram
  readonly metrics: CycleTimeMetrics
}

export function CycleTimeDistribution({
  histogram,
  metrics,
}: CycleTimeDistributionProps) {
  if (histogram.buckets.length === 0) {
    return (
      <section
        className="cycle-time-distribution"
        aria-labelledby="cycle-time-distribution-title"
      >
        <h2 id="cycle-time-distribution-title">Cycle Time Verteilung</h2>
        <p className="dashboard-status">
          Keine abgeschlossenen Cycle Times für die Verteilung verfügbar.
        </p>
      </section>
    )
  }

  const maxCount = Math.max(...histogram.buckets.map((bucket) => bucket.count))
  const markers = [
    { label: 'P50', value: metrics.medianCompletedDurationMs },
    { label: 'P85', value: metrics.p85CompletedDurationMs },
    { label: 'P95', value: metrics.p95CompletedDurationMs },
  ].filter(
    (marker): marker is { label: string; value: number } =>
      marker.value !== null,
  )

  return (
    <section
      className="cycle-time-distribution"
      aria-labelledby="cycle-time-distribution-title"
    >
      <header className="section-header">
        <h2 id="cycle-time-distribution-title">Cycle Time Verteilung</h2>
        <p>Abgeschlossene Tickets nach Cycle-Time-Intervall</p>
      </header>

      <div className="histogram-scroll">
        <div className="histogram">
          <div className="percentile-track" aria-label="Perzentilmarkierungen">
            {markers.map((marker) => (
              <span
                className="percentile-marker"
                aria-label={`${marker.label}: ${formatDurationMs(marker.value)}`}
                key={marker.label}
                style={{
                  left: `${getMarkerPosition(marker.value, histogram)}%`,
                }}
              >
                {marker.label}
              </span>
            ))}
          </div>

          <div
            className="histogram-bars"
            aria-label={`Histogramm mit ${histogram.validCycleTimeCount} abgeschlossenen Tickets`}
            role="img"
            style={{
              gridTemplateColumns: `repeat(${histogram.buckets.length}, minmax(88px, 1fr))`,
            }}
          >
            {histogram.buckets.map((bucket, index) => {
              const interval = formatInterval(
                bucket.lowerBoundDays,
                bucket.upperBoundDays,
                index === histogram.buckets.length - 1,
              )

              return (
                <div
                  className="histogram-column"
                  aria-label={`${interval}: ${bucket.count} Tickets`}
                  key={`${bucket.lowerBoundDays}-${bucket.upperBoundDays}`}
                >
                  <span className="histogram-count">{bucket.count}</span>
                  <div className="histogram-bar-area">
                    <div
                      className="histogram-bar"
                      style={{ height: `${(bucket.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="histogram-interval">{interval}</span>
                </div>
              )
            })}
          </div>
          <p className="histogram-x-axis">Cycle Time in Tagen</p>
        </div>
      </div>
    </section>
  )
}

function getMarkerPosition(
  value: number,
  histogram: CycleTimeHistogram,
): number {
  const min = histogram.minDurationMs
  const max = histogram.maxDurationMs

  if (min === null || max === null || min === max) {
    return 50
  }

  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

function formatInterval(
  lowerBoundDays: number,
  upperBoundDays: number,
  includesUpperBound: boolean,
): string {
  const lower = formatDays(lowerBoundDays)
  const upper = formatDays(upperBoundDays)

  if (lowerBoundDays === upperBoundDays) {
    return `${lower} d`
  }

  return includesUpperBound ? `${lower}–${upper} d` : `${lower}–<${upper} d`
}

function formatDays(days: number): string {
  return Number(days.toFixed(2)).toString()
}
