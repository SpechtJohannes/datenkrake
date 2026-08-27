import { describe, expect, it } from 'vitest'
import { getStatusById, getStatuses } from './statusDefinitions'

describe('local status data source', () => {
  it('loads all reliably known status definitions from the mock data', async () => {
    const statuses = await getStatuses()

    expect(statuses).toEqual([
      { id: 1, name: 'New', is_closed: false },
      { id: 2, name: 'Refined', is_closed: false },
      { id: 3, name: 'In Progress', is_closed: false },
      { id: 4, name: 'Review', is_closed: false },
      { id: 5, name: 'Done', is_closed: true },
    ])
  })

  it('resolves a known status by ID', async () => {
    await expect(getStatusById(4)).resolves.toEqual({
      id: 4,
      name: 'Review',
      is_closed: false,
    })
  })

  it('returns null for a status without a reliable definition', async () => {
    await expect(getStatusById(6)).resolves.toBeNull()
  })
})
