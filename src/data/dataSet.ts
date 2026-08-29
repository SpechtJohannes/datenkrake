import type { Issue, StatusDefinition } from './types'

export interface DataSet {
  readonly issues: readonly Issue[]
  readonly statusDefinitions: readonly StatusDefinition[]
}
