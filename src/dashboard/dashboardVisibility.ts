export const DASHBOARD_VISIBILITY_STORAGE_KEY =
  'datenkrake.dashboard.visibility'

export const DASHBOARD_SECTIONS = [
  { id: 'summary', label: 'Basiskennzahlen', defaultVisible: true },
  {
    id: 'cycleTimeSummary',
    label: 'Cycle Time Übersicht',
    defaultVisible: true,
  },
  {
    id: 'cycleTimeDistribution',
    label: 'Cycle Time Verteilung',
    defaultVisible: true,
  },
  {
    id: 'cycleTimeTrend',
    label: 'Cycle Time Verlauf',
    defaultVisible: true,
  },
  { id: 'throughput', label: 'Throughput', defaultVisible: true },
  { id: 'wip', label: 'Work in Progress', defaultVisible: true },
  { id: 'agingWip', label: 'Aging WIP', defaultVisible: true },
  { id: 'tickets', label: 'Tickets', defaultVisible: true },
] as const

export type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]['id']
export type DashboardVisibility = Record<DashboardSectionId, boolean>

export const DEFAULT_DASHBOARD_VISIBILITY = Object.fromEntries(
  DASHBOARD_SECTIONS.map((section) => [section.id, section.defaultVisible]),
) as DashboardVisibility

export function loadDashboardVisibility(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): DashboardVisibility {
  try {
    const rawValue = storage.getItem(DASHBOARD_VISIBILITY_STORAGE_KEY)
    if (rawValue === null) return createDefaultVisibility()

    const storedValue: unknown = JSON.parse(rawValue)
    if (!isRecord(storedValue)) return createDefaultVisibility()

    return Object.fromEntries(
      DASHBOARD_SECTIONS.map((section) => [
        section.id,
        typeof storedValue[section.id] === 'boolean'
          ? storedValue[section.id]
          : section.defaultVisible,
      ]),
    ) as DashboardVisibility
  } catch {
    return createDefaultVisibility()
  }
}

export function saveDashboardVisibility(
  visibility: DashboardVisibility,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  try {
    storage.setItem(
      DASHBOARD_VISIBILITY_STORAGE_KEY,
      JSON.stringify(visibility),
    )
  } catch {
    // The dashboard remains usable when browser storage is unavailable.
  }
}

export function createDefaultVisibility(): DashboardVisibility {
  return { ...DEFAULT_DASHBOARD_VISIBILITY }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
