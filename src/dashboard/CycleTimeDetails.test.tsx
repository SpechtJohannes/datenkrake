import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CycleTimeDetails } from './CycleTimeDetails'

describe('CycleTimeDetails', () => {
  it('shows that a cycle time has not started', () => {
    render(<CycleTimeDetails cycleTime={null} issueId={101} />)

    const details = screen.getByLabelText('Cycle Time für Issue #101')
    expect(within(details).getByText('Noch nicht gestartet')).toBeVisible()
  })

  it('shows a running cycle with start, open end, and formatted duration', () => {
    render(
      <CycleTimeDetails
        issueId={102}
        cycleTime={{
          startedAt: '2026-01-02T00:00:00Z',
          endedAt: null,
          durationMs: 2 * 24 * 60 * 60 * 1000,
          isRunning: true,
        }}
      />,
    )

    const details = screen.getByLabelText('Cycle Time für Issue #102')
    expect(within(details).getByText('Läuft')).toBeVisible()
    expect(within(details).getByText('Noch offen')).toBeVisible()
    expect(within(details).getByText('2d')).toBeVisible()
    expect(within(details).getByText('02.01.2026, 00:00')).toHaveAttribute(
      'datetime',
      '2026-01-02T00:00:00Z',
    )
  })

  it('shows a completed cycle with its final end and duration', () => {
    render(
      <CycleTimeDetails
        issueId={103}
        cycleTime={{
          startedAt: '2026-01-02T00:00:00Z',
          endedAt: '2026-01-05T00:00:00Z',
          durationMs: 3 * 24 * 60 * 60 * 1000,
          isRunning: false,
        }}
      />,
    )

    const details = screen.getByLabelText('Cycle Time für Issue #103')
    expect(within(details).getByText('Abgeschlossen')).toBeVisible()
    expect(within(details).getByText('3d')).toBeVisible()
    expect(within(details).getByText('05.01.2026, 00:00')).toHaveAttribute(
      'datetime',
      '2026-01-05T00:00:00Z',
    )
  })
})
