import { localStatusRepository } from './localStatusRepository'
import type { StatusRepository } from './statusRepository'
import type { StatusDefinition } from './types'

const statusRepository: StatusRepository = localStatusRepository

export function getStatuses(): Promise<readonly StatusDefinition[]> {
  return statusRepository.getStatuses()
}

export function getStatusById(
  statusId: number,
): Promise<StatusDefinition | null> {
  return statusRepository.getStatusById(statusId)
}

export type { StatusDefinition } from './types'
