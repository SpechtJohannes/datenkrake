import { useState } from 'react'
import type { WipHistoryPoint } from '../domain/wipHistory'

const WIDTH = 900
const HEIGHT = 360
const MARGIN = { top: 32, right: 32, bottom: 64, left: 62 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

interface WipTrendProps {
  points: readonly WipHistoryPoint[]
}

export function WipTrend({ points }: WipTrendProps) {
  const [selectedPoint, setSelectedPoint] = useState<WipHistoryPoint | null>(
    null,
  )

  if (points.length === 0) {
    return (
      <section className="wip-trend" aria-labelledby="wip-trend-title">
        <h2 id="wip-trend-title">Work in Progress</h2>
        <p className="dashboard-status">
          Keine gestarteten Cycle Times für die WIP-Historie verfügbar.
        </p>
      </section>
    )
  }

  const maxWip = Math.max(1, ...points.map((point) => point.wipCount))
  const yTicks = [...new Set([0, Math.ceil(maxWip / 2), maxWip])].sort(
    (left, right) => left - right,
  )
  const xTickIndexes = getTickIndexes(points.length)
  const linePoints = points
    .map(
      (point, index) =>
        `${scaleX(index, points.length)},${scaleY(point.wipCount, maxWip)}`,
    )
    .join(' ')

  return (
    <section className="wip-trend" aria-labelledby="wip-trend-title">
      <header className="section-header">
        <h2 id="wip-trend-title">Work in Progress</h2>
        <p>Täglicher WIP zum Stichtag 00:00 UTC</p>
      </header>

      <div className="wip-scroll">
        <div className="wip-chart-canvas">
          <svg
            className="wip-chart"
            aria-label={`WIP-Liniendiagramm mit ${points.length} Messpunkten, maximaler WIP ${maxWip}`}
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            {yTicks.map((tick) => {
              const y = scaleY(tick, maxWip)
              return (
                <g key={tick}>
                  <line
                    className="wip-grid-line"
                    x1={MARGIN.left}
                    x2={MARGIN.left + PLOT_WIDTH}
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="wip-axis-label"
                    x={MARGIN.left - 10}
                    y={y + 4}
                  >
                    {tick}
                  </text>
                </g>
              )
            })}

            {xTickIndexes.map((index) => (
              <text
                className="wip-axis-label wip-date-label"
                key={index}
                x={scaleX(index, points.length)}
                y={MARGIN.top + PLOT_HEIGHT + 28}
              >
                {dateFormatter.format(points[index].timestampMs)}
              </text>
            ))}

            <polyline className="wip-line" fill="none" points={linePoints} />

            {points.map((point, index) => {
              const label = `${dateFormatter.format(point.timestampMs)}: WIP ${point.wipCount}`
              return (
                <circle
                  className="wip-point"
                  aria-label={label}
                  aria-pressed={selectedPoint === point}
                  cx={scaleX(index, points.length)}
                  cy={scaleY(point.wipCount, maxWip)}
                  key={point.date}
                  onClick={() => setSelectedPoint(point)}
                  onFocus={() => setSelectedPoint(point)}
                  r="5"
                  role="button"
                  tabIndex={0}
                >
                  <title>{label}</title>
                </circle>
              )
            })}

            <text
              className="wip-axis-title"
              x={MARGIN.left + PLOT_WIDTH / 2}
              y={HEIGHT - 8}
            >
              Datum
            </text>
            <text
              className="wip-axis-title"
              transform={`translate(18 ${MARGIN.top + PLOT_HEIGHT / 2}) rotate(-90)`}
            >
              Tickets im WIP
            </text>
          </svg>

          {selectedPoint !== null && (
            <aside className="wip-detail" aria-live="polite">
              <strong>{dateFormatter.format(selectedPoint.timestampMs)}</strong>
              <span>WIP: {selectedPoint.wipCount}</span>
            </aside>
          )}
        </div>
      </div>
    </section>
  )
}

function scaleX(index: number, pointCount: number): number {
  return pointCount === 1
    ? MARGIN.left + PLOT_WIDTH / 2
    : MARGIN.left + (index / (pointCount - 1)) * PLOT_WIDTH
}

function scaleY(value: number, max: number): number {
  return MARGIN.top + PLOT_HEIGHT - (value / max) * PLOT_HEIGHT
}

function getTickIndexes(pointCount: number): number[] {
  if (pointCount === 1) return [0]
  return [...new Set([0, Math.floor((pointCount - 1) / 2), pointCount - 1])]
}
