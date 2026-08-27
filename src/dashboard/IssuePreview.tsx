import type { RedmineIssue } from '../data/issues'

interface IssuePreviewProps {
  issues: readonly RedmineIssue[]
}

export function IssuePreview({ issues }: IssuePreviewProps) {
  return (
    <section className="issue-preview" aria-labelledby="issue-preview-title">
      <h2 id="issue-preview-title">Vorschau der ersten fünf Issues</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Betreff</th>
              <th scope="col">Status</th>
              <th scope="col">Journaleinträge</th>
            </tr>
          </thead>
          <tbody>
            {issues.slice(0, 5).map((issue) => (
              <tr key={issue.id}>
                <td>{issue.id}</td>
                <td>{issue.subject}</td>
                <td>{issue.status.name}</td>
                <td>{issue.journals.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
