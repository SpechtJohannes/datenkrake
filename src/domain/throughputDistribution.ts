import type { StatusDefinition } from '../data/issues'
import { calculatePercentile } from './cycleTimeMetrics'
import type { StatusHistoryIssue } from './statusHistory'
import {
  calculateWeeklyThroughput,
  type WeeklyThroughput,
} from './weeklyThroughput'

export interface ThroughputDistribution {
  weeks: WeeklyThroughput[]
  weekCount: number
  totalThroughput: number
  averageThroughput: number | null
  medianThroughput: number | null
}

export function calculateThroughputDistribution(
  issues: readonly StatusHistoryIssue[],
  statusDefinitions: readonly StatusDefinition[],
): ThroughputDistribution {
  const weeks = calculateWeeklyThroughput(issues, statusDefinitions)
  const weeklyCounts = weeks.map((week) => week.completedCount)
  const totalThroughput = weeklyCounts.reduce(
    (sum, completedCount) => sum + completedCount,
    0,
  )

  return {
    weeks,
    weekCount: weeks.length,
    totalThroughput,
    averageThroughput:
      weeks.length === 0 ? null : totalThroughput / weeks.length,
    medianThroughput: calculatePercentile(weeklyCounts, 0.5),
  }
}
