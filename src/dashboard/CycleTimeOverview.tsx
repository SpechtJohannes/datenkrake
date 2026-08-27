import type { RedmineIssue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import { calculateCycleTimeHistogram } from '../domain/cycleTimeHistogram'
import { calculateCycleTimeMetrics } from '../domain/cycleTimeMetrics'
import { calculateCycleTimeTrend } from '../domain/cycleTimeTrend'
import type { ReferenceTime } from '../domain/statusDwellTime'
import { CycleTimeDistribution } from './CycleTimeDistribution'
import { CycleTimeSummary } from './CycleTimeSummary'
import { CycleTimeTrend } from './CycleTimeTrend'

interface CycleTimeOverviewProps {
  issues: readonly RedmineIssue[]
  statusDefinitions: readonly StatusDefinition[]
  referenceTime: ReferenceTime
}

export function CycleTimeOverview({
  issues,
  statusDefinitions,
  referenceTime,
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
      <CycleTimeSummary metrics={metrics} />
      <CycleTimeDistribution histogram={histogram} metrics={metrics} />
      <CycleTimeTrend metrics={metrics} points={trendPoints} />
    </>
  )
}
