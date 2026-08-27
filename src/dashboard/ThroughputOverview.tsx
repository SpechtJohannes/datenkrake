import type { RedmineIssue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import { calculateWeeklyThroughput } from '../domain/weeklyThroughput'
import { ThroughputChart } from './ThroughputChart'

interface ThroughputOverviewProps {
  issues: readonly RedmineIssue[]
  statusDefinitions: readonly StatusDefinition[]
}

export function ThroughputOverview({
  issues,
  statusDefinitions,
}: ThroughputOverviewProps) {
  const weeks = calculateWeeklyThroughput(issues, statusDefinitions)

  return <ThroughputChart weeks={weeks} />
}
