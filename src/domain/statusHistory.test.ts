import { describe, expect, it } from 'vitest'
import type { RedmineJournalDetail } from '../data/issues'
import {
  reconstructStatusHistory,
  type StatusHistoryIssue,
} from './statusHistory'

const DAY_MS = 24 * 60 * 60 * 1000

function createIssue(
  overrides: Partial<StatusHistoryIssue> = {},
): StatusHistoryIssue {
  return {
    status: { id: 1, name: 'New', is_closed: false },
    created_on: '2026-01-01T00:00:00Z',
    closed_on: null,
    journals: [],
    ...overrides,
  }
}

function createJournal(
  id: number,
  createdOn: string,
  details: readonly Partial<RedmineJournalDetail>[],
) {
  return { id, created_on: createdOn, details }
}

function statusChange(oldStatusId: string, newStatusId: string) {
  return {
    property: 'attr',
    name: 'status_id',
    old_value: oldStatusId,
    new_value: newStatusId,
  }
}

describe('reconstructStatusHistory', () => {
  it('creates one active phase for an issue without a status change', () => {
    const history = reconstructStatusHistory(createIssue())

    expect(history).toEqual([
      {
        statusId: 1,
        statusName: 'New',
        startedAt: '2026-01-01T00:00:00Z',
        endedAt: null,
        durationMs: null,
      },
    ])
  })

  it('reconstructs the initial and current phase from one status change', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 2, name: 'In Progress', is_closed: false },
        journals: [
          createJournal(10, '2026-01-02T00:00:00Z', [statusChange('1', '2')]),
        ],
      }),
    )

    expect(history).toEqual([
      {
        statusId: 1,
        statusName: null,
        startedAt: '2026-01-01T00:00:00Z',
        endedAt: '2026-01-02T00:00:00Z',
        durationMs: DAY_MS,
      },
      {
        statusId: 2,
        statusName: 'In Progress',
        startedAt: '2026-01-02T00:00:00Z',
        endedAt: null,
        durationMs: null,
      },
    ])
  })

  it('sorts multiple changes chronologically and calculates phase boundaries', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 3, name: 'Review', is_closed: false },
        journals: [
          createJournal(30, '2026-01-03T00:00:00Z', [statusChange('2', '3')]),
          createJournal(20, '2026-01-02T00:00:00Z', [statusChange('1', '2')]),
        ],
      }),
    )

    expect(history.map((phase) => phase.statusId)).toEqual([1, 2, 3])
    expect(history.map((phase) => phase.startedAt)).toEqual([
      '2026-01-01T00:00:00Z',
      '2026-01-02T00:00:00Z',
      '2026-01-03T00:00:00Z',
    ])
    expect(history[1]).toMatchObject({
      endedAt: '2026-01-03T00:00:00Z',
      durationMs: DAY_MS,
    })
    expect(history[2]).toMatchObject({
      statusName: 'Review',
      endedAt: null,
      durationMs: null,
    })
  })

  it('uses journal IDs to order changes with identical timestamps deterministically', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 3, name: 'Review', is_closed: false },
        journals: [
          createJournal(20, '2026-01-02T00:00:00Z', [statusChange('2', '3')]),
          createJournal(10, '2026-01-02T00:00:00Z', [statusChange('1', '2')]),
        ],
      }),
    )

    expect(history.map((phase) => phase.statusId)).toEqual([1, 2, 3])
    expect(history[1].durationMs).toBe(0)
  })

  it('ends the current phase at a reliable closing timestamp', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 5, name: 'Done', is_closed: true },
        closed_on: '2026-01-04T00:00:00Z',
        journals: [
          createJournal(10, '2026-01-03T00:00:00Z', [statusChange('4', '5')]),
        ],
      }),
    )

    expect(history.at(-1)).toEqual({
      statusId: 5,
      statusName: 'Done',
      startedAt: '2026-01-03T00:00:00Z',
      endedAt: '2026-01-04T00:00:00Z',
      durationMs: DAY_MS,
    })
  })

  it('ignores incomplete, invalid, and irrelevant journal details', () => {
    const history = reconstructStatusHistory(
      createIssue({
        journals: [
          createJournal(1, '2026-01-02T00:00:00Z', [
            { property: 'attr', name: 'status_id', old_value: '1' },
            statusChange('invalid', '2'),
            { ...statusChange('1', '2'), property: 'cf' },
            { ...statusChange('1', '2'), name: 'done_ratio' },
          ]),
          createJournal(2, 'not-a-date', [statusChange('1', '2')]),
        ],
      }),
    )

    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ statusId: 1, statusName: 'New' })
  })

  it('ignores journals without status changes without disrupting valid changes', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 2, name: 'In Progress', is_closed: false },
        journals: [
          createJournal(1, '2026-01-01T12:00:00Z', []),
          createJournal(2, '2026-01-01T18:00:00Z', [
            {
              property: 'attr',
              name: 'done_ratio',
              old_value: '0',
              new_value: '30',
            },
          ]),
          createJournal(3, '2026-01-02T00:00:00Z', [statusChange('1', '2')]),
        ],
      }),
    )

    expect(history.map((phase) => phase.statusId)).toEqual([1, 2])
  })

  it('skips a disconnected status detail instead of failing the history', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 2, name: 'In Progress', is_closed: false },
        journals: [
          createJournal(1, '2026-01-02T00:00:00Z', [statusChange('1', '2')]),
          createJournal(2, '2026-01-03T00:00:00Z', [statusChange('7', '8')]),
        ],
      }),
    )

    expect(history.map((phase) => phase.statusId)).toEqual([1, 2])
    expect(history.at(-1)).toMatchObject({
      statusId: 2,
      statusName: 'In Progress',
    })
  })

  it('resolves historical names from supplied status definitions', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 2, name: 'Refined', is_closed: false },
        journals: [
          createJournal(1, '2026-01-02T00:00:00Z', [statusChange('1', '2')]),
        ],
      }),
      [
        { id: 1, name: 'New', is_closed: false },
        { id: 2, name: 'Refined', is_closed: false },
      ],
    )

    expect(history.map((phase) => phase.statusName)).toEqual(['New', 'Refined'])
  })

  it('keeps a historical name null when the catalog has no definition', () => {
    const history = reconstructStatusHistory(
      createIssue({
        status: { id: 2, name: 'Refined', is_closed: false },
        journals: [
          createJournal(1, '2026-01-02T00:00:00Z', [statusChange('1', '6')]),
          createJournal(2, '2026-01-03T00:00:00Z', [statusChange('6', '2')]),
        ],
      }),
      [
        { id: 1, name: 'New', is_closed: false },
        { id: 2, name: 'Refined', is_closed: false },
      ],
    )

    expect(history.find((phase) => phase.statusId === 6)?.statusName).toBeNull()
  })
})
