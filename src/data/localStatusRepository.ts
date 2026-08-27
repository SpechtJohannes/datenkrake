import mockIssues from './mock/issues.json'
import type { StatusRepository } from './statusRepository'
import type { RedmineIssuesResponse, StatusDefinition } from './types'

const mockResponse: RedmineIssuesResponse = mockIssues

function collectStatusDefinitions(): readonly StatusDefinition[] {
  const definitions = new Map<number, StatusDefinition>()
  const ambiguousStatusIds = new Set<number>()

  for (const issue of mockResponse.issues) {
    const definition = issue.status
    const existingDefinition = definitions.get(definition.id)

    if (
      existingDefinition !== undefined &&
      (existingDefinition.name !== definition.name ||
        existingDefinition.is_closed !== definition.is_closed)
    ) {
      ambiguousStatusIds.add(definition.id)
      continue
    }

    definitions.set(definition.id, definition)
  }

  return Array.from(definitions.values())
    .filter((definition) => !ambiguousStatusIds.has(definition.id))
    .sort((left, right) => left.id - right.id)
}

const statusDefinitions = collectStatusDefinitions()

export const localStatusRepository: StatusRepository = {
  async getStatuses() {
    return statusDefinitions
  },

  async getStatusById(statusId) {
    return (
      statusDefinitions.find((definition) => definition.id === statusId) ?? null
    )
  },
}
