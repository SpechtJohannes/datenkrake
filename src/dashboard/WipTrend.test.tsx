import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WipTrend } from './WipTrend'

const points = [
  {
    date: '2026-01-01',
    timestampMs: Date.parse('2026-01-01T00:00:00Z'),
    wipCount: 0,
  },
  {
    date: '2026-01-02',
    timestampMs: Date.parse('2026-01-02T00:00:00Z'),
    wipCount: 2,
  },
  {
    date: '2026-01-03',
    timestampMs: Date.parse('2026-01-03T00:00:00Z'),
    wipCount: 1,
  },
]

describe('WipTrend', () => {
  it('shows an accessible line chart, daily points, and automatic Y scaling', () => {
    render(<WipTrend points={points} />)

    expect(
      screen.getByRole('heading', { name: 'Work in Progress' }),
    ).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: 'WIP-Liniendiagramm mit 3 Messpunkten, maximaler WIP 2',
      }),
    ).toBeVisible()
    expect(screen.getByLabelText('01.01.2026: WIP 0')).toBeVisible()
    expect(screen.getByLabelText('02.01.2026: WIP 2')).toBeVisible()
    expect(screen.getByLabelText('03.01.2026: WIP 1')).toBeVisible()
  })

  it('shows date and WIP count when a data point is focused or selected', () => {
    render(<WipTrend points={points} />)
    const point = screen.getByLabelText('02.01.2026: WIP 2')

    fireEvent.focus(point)

    expect(screen.getByText('02.01.2026', { selector: 'strong' })).toBeVisible()
    expect(screen.getByText('WIP: 2')).toBeVisible()
  })

  it('renders a single point meaningfully', () => {
    render(<WipTrend points={[points[1]]} />)

    expect(
      screen.getByRole('img', {
        name: 'WIP-Liniendiagramm mit 1 Messpunkten, maximaler WIP 2',
      }),
    ).toBeVisible()
    expect(screen.getByLabelText('02.01.2026: WIP 2')).toBeVisible()
  })

  it('shows a neutral state without WIP data', () => {
    render(<WipTrend points={[]} />)

    expect(
      screen.getByText(
        'Keine gestarteten Cycle Times für die WIP-Historie verfügbar.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
