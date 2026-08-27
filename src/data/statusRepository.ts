import type { StatusDefinition } from './types'

export interface StatusRepository {
  getStatuses(): Promise<readonly StatusDefinition[]>
  getStatusById(statusId: number): Promise<StatusDefinition | null>
}
