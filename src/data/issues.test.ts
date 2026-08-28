import { describe, expect, it } from 'vitest'
import { getIssues } from './issues'

describe('local issue data source', () => {
  it('loads issues with their essential fields', async () => {
    const issues = await getIssues()

    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        subject: expect.any(String),
        status: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          is_closed: expect.any(Boolean),
        }),
      }),
    )
    expect(issues[0]).not.toHaveProperty('description')
    expect(issues[0]).not.toHaveProperty('author')
  })

  it('makes only status-change journal data accessible', async () => {
    const issues = await getIssues()
    const issueWithJournal = issues.find((issue) => issue.journals.length > 0)

    expect(issueWithJournal).toBeDefined()
    expect(issueWithJournal?.journals[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        created_on: expect.any(String),
        details: expect.any(Array),
      }),
    )
    expect(issueWithJournal?.journals[0]).not.toHaveProperty('notes')
    expect(issueWithJournal?.journals[0]).not.toHaveProperty('user')
    expect(issueWithJournal?.journals[0].details[0]).toEqual(
      expect.objectContaining({
        property: expect.any(String),
        name: expect.any(String),
        old_value: expect.any(String),
        new_value: expect.any(String),
      }),
    )
  })
})
