import type { Issue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import { calculateCycleTimeHistogram } from '../domain/cycleTimeHistogram'
import { calculateCycleTimeMetrics } from '../domain/cycleTimeMetrics'
import { calculateCycleTimeTrend } from '../domain/cycleTimeTrend'
import type { ReferenceTime } from '../domain/statusDwellTime'
import { CycleTimeDistribution } from './CycleTimeDistribution'
import { CycleTimeSummary } from './CycleTimeSummary'
import { CycleTimeTrend } from './CycleTimeTrend'

interface CycleTimeOverviewProps {
  readonly issues: readonly Issue[]
  readonly statusDefinitions: readonly StatusDefinition[]
  readonly referenceTime: ReferenceTime
  readonly showDistribution: boolean
  readonly showSummary: boolean
  readonly showTrend: boolean
}

export function CycleTimeOverview({
  issues,
  statusDefinitions,
  referenceTime,
  showDistribution,
  showSummary,
  showTrend,
}: CycleTimeOverviewProps) {
  const metrics = calculateCycleTimeMetrics(
    issues,
    statusDefinitions,
    referenceTime,
  )
  const histogram = calculateCycleTimeHistogram(
    issues,
    statusDefinitions,
    referenceTime,
  )
  const trendPoints = calculateCycleTimeTrend(issues, statusDefinitions)

  return (
    <>
      {showSummary && <CycleTimeSummary metrics={metrics} />}
      {showDistribution && (
        <CycleTimeDistribution histogram={histogram} metrics={metrics} />
      )}
      {showTrend && <CycleTimeTrend metrics={metrics} points={trendPoints} />}
    </>
  )
}
