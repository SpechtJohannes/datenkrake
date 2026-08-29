import { useState } from 'react'
import type { CycleTimeMetrics } from '../domain/cycleTimeMetrics'
import type { CycleTimeTrendPoint } from '../domain/cycleTimeTrend'
import { formatDurationMs } from '../domain/statusDwellTime'

const DAY_MS = 24 * 60 * 60 * 1000
const WIDTH = 900
const HEIGHT = 380
const MARGIN = { top: 34, right: 32, bottom: 64, left: 72 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

interface CycleTimeTrendProps {
  readonly metrics: CycleTimeMetrics
  readonly points: readonly CycleTimeTrendPoint[]
}

export function CycleTimeTrend({ metrics, points }: CycleTimeTrendProps) {
  const [selectedPoint, setSelectedPoint] =
    useState<CycleTimeTrendPoint | null>(null)

  if (points.length === 0) {
    return (
      <section
        className="cycle-time-trend"
        aria-labelledby="cycle-time-trend-title"
      >
        <h2 id="cycle-time-trend-title">Cycle Time Verlauf</h2>
        <p className="dashboard-status">
          Keine abgeschlossenen Cycle Times für den zeitlichen Verlauf
          verfügbar.
        </p>
      </section>
    )
  }

  const minCompletedAtMs = points[0].completedAtMs
  const maxCompletedAtMs = points.at(-1)?.completedAtMs ?? minCompletedAtMs
  const references = [
    { label: 'P50', value: metrics.medianCompletedDurationMs },
    { label: 'P85', value: metrics.p85CompletedDurationMs },
    { label: 'P95', value: metrics.p95CompletedDurationMs },
  ].filter(
    (reference): reference is { label: string; value: number } =>
      reference.value !== null,
  )
  const maxDurationMs = Math.max(
    DAY_MS,
    ...points.map((point) => point.durationMs),
    ...references.map((reference) => reference.value),
  )
  const xTicks = getXTicks(minCompletedAtMs, maxCompletedAtMs)
  const yTicks = [0, maxDurationMs / 2, maxDurationMs]
  const selectedPointIndex =
    selectedPoint === null ? -1 : points.indexOf(selectedPoint)
  const selectedPosition =
    selectedPointIndex === -1
      ? null
      : getPointPosition(
          points,
          selectedPointIndex,
          minCompletedAtMs,
          maxCompletedAtMs,
          maxDurationMs,
        )

  return (
    <section
      className="cycle-time-trend"
      aria-labelledby="cycle-time-trend-title"
    >
      <header className="section-header">
        <h2 id="cycle-time-trend-title">Cycle Time Verlauf</h2>
        <p>Abgeschlossene Cycle Times nach ihrem Abschlusszeitpunkt</p>
      </header>

      <div className="trend-scroll">
        <div className="trend-chart-canvas">
          <svg
            className="trend-chart"
            aria-label={`Punktdiagramm mit ${points.length} abgeschlossenen Issues`}
            onClick={() => setSelectedPoint(null)}
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            <line
              className="trend-axis"
              x1={MARGIN.left}
              x2={MARGIN.left}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_HEIGHT}
            />
            <line
              className="trend-axis"
              x1={MARGIN.left}
              x2={MARGIN.left + PLOT_WIDTH}
              y1={MARGIN.top + PLOT_HEIGHT}
              y2={MARGIN.top + PLOT_HEIGHT}
            />

            {yTicks.map((tick) => {
              const y = scaleY(tick, maxDurationMs)
              return (
                <g key={tick}>
                  <line
                    className="trend-grid-line"
                    x1={MARGIN.left}
                    x2={MARGIN.left + PLOT_WIDTH}
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="trend-axis-label"
                    x={MARGIN.left - 10}
                    y={y + 4}
                  >
                    {formatDays(tick)} d
                  </text>
                </g>
              )
            })}

            {xTicks.map((tick) => {
              const x = scaleX(tick, minCompletedAtMs, maxCompletedAtMs)
              return (
                <text
                  className="trend-axis-label trend-date-label"
                  key={tick}
                  x={x}
                  y={MARGIN.top + PLOT_HEIGHT + 28}
                >
                  {dateFormatter.format(tick)}
                </text>
              )
            })}

            {references.map((reference) => {
              const y = scaleY(reference.value, maxDurationMs)
              return (
                <g
                  aria-label={`${reference.label} Referenz: ${formatDurationMs(reference.value)}`}
                  key={reference.label}
                  role="img"
                >
                  <line
                    className={`trend-reference trend-reference-${reference.label.toLowerCase()}`}
                    x1={MARGIN.left}
                    x2={MARGIN.left + PLOT_WIDTH}
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="trend-reference-label"
                    x={MARGIN.left + 8}
                    y={y - 5}
                  >
                    {reference.label}
                  </text>
                </g>
              )
            })}

            {points.map((point, index) => {
              const { x, y } = getPointPosition(
                points,
                index,
                minCompletedAtMs,
                maxCompletedAtMs,
                maxDurationMs,
              )
              const accessibleLabel = `Issue #${point.issueId}: ${point.subject}, abgeschlossen ${dateTimeFormatter.format(point.completedAtMs)}, Cycle Time ${formatDurationMs(point.durationMs)}`

              return (
                <circle
                  className="trend-point"
                  aria-label={accessibleLabel}
                  aria-pressed={selectedPoint === point}
                  cx={x}
                  cy={y}
                  key={`${point.issueId}-${point.completedAt}-${point.subject}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedPoint(point)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      setSelectedPoint(point)
                    }
                  }}
                  r="6"
                  role="button"
                  tabIndex={0}
                >
                  <title>{accessibleLabel}</title>
                </circle>
              )
            })}

            <text
              className="trend-axis-title"
              x={MARGIN.left + PLOT_WIDTH / 2}
              y={HEIGHT - 8}
            >
              Abschlusszeitpunkt
            </text>
            <text
              className="trend-axis-title"
              transform={`translate(18 ${MARGIN.top + PLOT_HEIGHT / 2}) rotate(-90)`}
            >
              Cycle Time in Tagen
            </text>
          </svg>

          {selectedPoint !== null && selectedPosition !== null && (
            <aside
              className={`trend-detail ${selectedPosition.x > WIDTH * 0.65 ? 'trend-detail-left' : ''}`}
              aria-label={`Details zu Issue #${selectedPoint.issueId}`}
              style={{
                left: `${(selectedPosition.x / WIDTH) * 100}%`,
                top: `${(selectedPosition.y / HEIGHT) * 100}%`,
              }}
            >
              <span className="trend-ticket-reference">
                #{selectedPoint.issueId}
              </span>
              <strong>{selectedPoint.subject}</strong>
              <dl>
                <div>
                  <dt>Cycle Time</dt>
                  <dd>{formatDurationMs(selectedPoint.durationMs)}</dd>
                </div>
                <div>
                  <dt>Abschlussdatum</dt>
                  <dd>
                    <time dateTime={selectedPoint.completedAt}>
                      {dateTimeFormatter.format(selectedPoint.completedAtMs)}
                    </time>
                  </dd>
                </div>
              </dl>
            </aside>
          )}
        </div>
      </div>
    </section>
  )
}

function scaleX(value: number, min: number, max: number): number {
  return min === max
    ? MARGIN.left + PLOT_WIDTH / 2
    : MARGIN.left + ((value - min) / (max - min)) * PLOT_WIDTH
}

function scaleY(value: number, max: number): number {
  return MARGIN.top + PLOT_HEIGHT - (value / max) * PLOT_HEIGHT
}

function getXTicks(min: number, max: number): number[] {
  return min === max ? [min] : [min, min + (max - min) / 2, max]
}

function getCoincidentPointOffset(
  points: readonly CycleTimeTrendPoint[],
  pointIndex: number,
): number {
  const point = points[pointIndex]
  const coincidentPoints = points.filter(
    (candidate) => candidate.completedAtMs === point.completedAtMs,
  )
  const indexWithinGroup = coincidentPoints.findIndex(
    (candidate) =>
      candidate.issueId === point.issueId &&
      candidate.subject === point.subject,
  )

  return (indexWithinGroup - (coincidentPoints.length - 1) / 2) * 12
}

function getPointPosition(
  points: readonly CycleTimeTrendPoint[],
  pointIndex: number,
  minCompletedAtMs: number,
  maxCompletedAtMs: number,
  maxDurationMs: number,
): { x: number; y: number } {
  const point = points[pointIndex]
  return {
    x:
      scaleX(point.completedAtMs, minCompletedAtMs, maxCompletedAtMs) +
      getCoincidentPointOffset(points, pointIndex),
    y: scaleY(point.durationMs, maxDurationMs),
  }
}

function formatDays(durationMs: number): string {
  return Number((durationMs / DAY_MS).toFixed(1)).toString()
}
