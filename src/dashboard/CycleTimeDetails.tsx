import type { CycleTimeResult } from '../domain/cycleTime'
import { formatDurationMs } from '../domain/statusDwellTime'

interface CycleTimeDetailsProps {
  readonly cycleTime: CycleTimeResult | null
  readonly issueId: number
}

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

export function CycleTimeDetails({
  cycleTime,
  issueId,
}: CycleTimeDetailsProps) {
  if (cycleTime === null) {
    return (
      <dl
        className="cycle-time-details"
        aria-label={`Cycle Time für Issue #${issueId}`}
      >
        <CycleTimeValue label="Status" value="Noch nicht gestartet" />
        <CycleTimeValue label="Start" value="–" />
        <CycleTimeValue label="Ende" value="–" />
        <CycleTimeValue label="Dauer" value="–" />
      </dl>
    )
  }

  return (
    <dl
      className="cycle-time-details"
      aria-label={`Cycle Time für Issue #${issueId}`}
    >
      <CycleTimeValue
        label="Status"
        value={cycleTime.isRunning ? 'Läuft' : 'Abgeschlossen'}
      />
      <CycleTimeValue
        label="Start"
        value={formatDateTime(cycleTime.startedAt)}
        dateTime={cycleTime.startedAt}
      />
      <CycleTimeValue
        label="Ende"
        value={
          cycleTime.endedAt === null
            ? 'Noch offen'
            : formatDateTime(cycleTime.endedAt)
        }
        dateTime={cycleTime.endedAt}
      />
      <CycleTimeValue
        label="Dauer"
        value={
          cycleTime.durationMs === null
            ? 'Nicht verfügbar'
            : formatDurationMs(cycleTime.durationMs)
        }
      />
    </dl>
  )
}

interface CycleTimeValueProps {
  readonly label: string
  readonly value: string
  readonly dateTime?: string | null
}

function CycleTimeValue({ label, value, dateTime }: CycleTimeValueProps) {
  return (
    <div>
      <dt>Cycle Time {label}</dt>
      <dd>
        {dateTime === undefined || dateTime === null ? (
          value
        ) : (
          <time dateTime={dateTime}>{value}</time>
        )}
      </dd>
    </div>
  )
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? dateTimeFormatter.format(timestamp)
    : 'Nicht verfügbar'
}
