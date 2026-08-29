import type { Issue } from '../data/issues'
import type { StatusDefinition } from '../data/statusDefinitions'
import type { ReferenceTime } from '../domain/statusDwellTime'
import { calculateWipHistory } from '../domain/wipHistory'
import { WipTrend } from './WipTrend'

interface WipOverviewProps {
  readonly issues: readonly Issue[]
  readonly statusDefinitions: readonly StatusDefinition[]
  readonly referenceTime: ReferenceTime
}

export function WipOverview({
  issues,
  statusDefinitions,
  referenceTime,
}: WipOverviewProps) {
  const points = calculateWipHistory(issues, statusDefinitions, referenceTime)

  return <WipTrend points={points} />
}
