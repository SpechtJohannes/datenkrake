import { describe, expect, it, vi } from 'vitest'
import {
  createDefaultVisibility,
  DASHBOARD_SECTIONS,
  DASHBOARD_VISIBILITY_STORAGE_KEY,
  loadDashboardVisibility,
  saveDashboardVisibility,
} from './dashboardVisibility'

describe('dashboard visibility persistence', () => {
  it('uses the central all-visible defaults without stored data', () => {
    const visibility = loadDashboardVisibility({ getItem: () => null })

    expect(DASHBOARD_SECTIONS).toHaveLength(10)
    expect(Object.values(visibility).every(Boolean)).toBe(true)
  })

  it('stores the complete configuration in local storage', () => {
    const setItem = vi.fn()
    const visibility = { ...createDefaultVisibility(), throughput: false }

    saveDashboardVisibility(visibility, { setItem })

    expect(setItem).toHaveBeenCalledWith(
      DASHBOARD_VISIBILITY_STORAGE_KEY,
      JSON.stringify(visibility),
    )
  })

  it.each(['invalid JSON', 'null', '[]', '42'])(
    'falls back to defaults for invalid stored data: %s',
    (storedValue) => {
      expect(loadDashboardVisibility({ getItem: () => storedValue })).toEqual(
        createDefaultVisibility(),
      )
    },
  )

  it('merges an older incomplete configuration with new defaults', () => {
    const visibility = loadDashboardVisibility({
      getItem: () => JSON.stringify({ summary: false, throughput: true }),
    })

    expect(visibility.summary).toBe(false)
    expect(visibility.throughput).toBe(true)
    expect(visibility.cycleTimeSummary).toBe(true)
    expect(visibility.wip).toBe(true)
    expect(visibility.agingWip).toBe(true)
    expect(visibility.currentWipByStatus).toBe(true)
    expect(visibility.aggregatedStatusDwellTimes).toBe(true)
    expect(visibility.tickets).toBe(true)
  })

  it('ignores invalid property values and unknown properties', () => {
    const visibility = loadDashboardVisibility({
      getItem: () =>
        JSON.stringify({ summary: 'no', tickets: false, obsolete: false }),
    })

    expect(visibility.summary).toBe(true)
    expect(visibility.tickets).toBe(false)
    expect(visibility).not.toHaveProperty('obsolete')
  })
})
