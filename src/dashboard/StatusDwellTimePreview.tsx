import type { RedmineIssue } from '../data/issues'
import {
  calculateStatusDwellTimes,
  formatDurationMs,
  type ReferenceTime,
} from '../domain/statusDwellTime'

const PREVIEW_LIMIT = 10

interface StatusDwellTimePreviewProps {
  issues: readonly RedmineIssue[]
  referenceTime: ReferenceTime
}

export function StatusDwellTimePreview({
  issues,
  referenceTime,
}: StatusDwellTimePreviewProps) {
  return (
    <section
      className="status-dwell-preview"
      aria-labelledby="status-dwell-title"
    >
      <header className="section-header">
        <h2 id="status-dwell-title">Statusverweilzeiten</h2>
        <p>
          Plausibilitätsansicht für die ersten {PREVIEW_LIMIT} geladenen Issues
        </p>
      </header>

      <div className="status-dwell-list">
        {issues.slice(0, PREVIEW_LIMIT).map((issue) => {
          const dwellTimes = calculateStatusDwellTimes(issue, referenceTime)
          const issueTitleId = `status-dwell-issue-${issue.id}`

          return (
            <article
              className="status-dwell-card"
              aria-labelledby={issueTitleId}
              key={issue.id}
            >
              <header className="status-dwell-card-header">
                <h3 id={issueTitleId}>
                  Issue #{issue.id}: {issue.subject}
                </h3>
                <p>
                  Aktueller Status: <strong>{issue.status.name}</strong>
                </p>
              </header>

              <div className="table-scroll">
                <table>
                  <caption className="visually-hidden">
                    Statusverweilzeiten für Issue #{issue.id}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Status-ID</th>
                      <th scope="col">Statusname</th>
                      <th scope="col">Gesamtverweilzeit</th>
                      <th scope="col">Aufenthalte</th>
                      <th scope="col">Aktueller Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dwellTimes.map((dwellTime) => (
                      <tr key={dwellTime.statusId}>
                        <td>{dwellTime.statusId}</td>
                        <td>{dwellTime.statusName ?? 'Nicht bekannt'}</td>
                        <td>{formatDurationMs(dwellTime.totalDurationMs)}</td>
                        <td>{dwellTime.visitCount}</td>
                        <td>{dwellTime.isCurrent ? 'Aktuell' : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
