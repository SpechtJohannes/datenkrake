import type { WeeklyThroughput } from '../domain/weeklyThroughput'

interface ThroughputChartProps {
  readonly weeks: readonly WeeklyThroughput[]
}

export function ThroughputChart({ weeks }: ThroughputChartProps) {
  if (weeks.length === 0) {
    return (
      <section
        className="throughput-section"
        aria-labelledby="throughput-title"
      >
        <h2 id="throughput-title">Throughput</h2>
        <p className="dashboard-status">
          Keine abgeschlossenen Tickets für den Throughput verfügbar.
        </p>
      </section>
    )
  }

  const maxCount = Math.max(...weeks.map((week) => week.completedCount))

  return (
    <section className="throughput-section" aria-labelledby="throughput-title">
      <header className="section-header">
        <h2 id="throughput-title">Throughput</h2>
        <p>Abgeschlossene Tickets pro ISO-Kalenderwoche</p>
      </header>

      <div className="throughput-scroll">
        <div className="throughput-chart">
          <div
            className="throughput-bars"
            aria-label={`Throughput-Diagramm mit ${weeks.length} Kalenderwochen`}
            role="img"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, minmax(88px, 1fr))`,
            }}
          >
            {weeks.map((week) => {
              const label = `KW ${week.isoWeek} / ${week.isoWeekYear}`

              return (
                <div
                  className="throughput-column"
                  aria-label={`${label}: ${week.completedCount} abgeschlossene Tickets`}
                  key={`${week.isoWeekYear}-${week.isoWeek}`}
                >
                  <span className="throughput-count">
                    {week.completedCount}
                  </span>
                  <div className="throughput-bar-area">
                    <div
                      className={`throughput-bar${week.completedCount === 0 ? ' throughput-bar-zero' : ''}`}
                      style={{
                        height: `${(week.completedCount / maxCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="throughput-week-label">{label}</span>
                </div>
              )
            })}
          </div>
          <p className="throughput-x-axis">ISO-Kalenderwoche</p>
        </div>
      </div>
    </section>
  )
}
