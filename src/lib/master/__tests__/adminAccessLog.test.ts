import { describe, it, expect } from 'vitest'
import type { AdminAccessAction } from '../adminAccessLog'

/**
 * Static tests for AdminAccessAction — the runtime DB-touching functions
 * are exercised through integration tests at the API layer. These tests
 * just lock in the action vocabulary so we can't accidentally introduce
 * a typo across the route handlers.
 */

describe('AdminAccessAction vocabulary', () => {
  it('contains all expected actions', () => {
    const actions: AdminAccessAction[] = [
      'view_master_debug',
      'force_extract_portrait',
      'reset_portrait',
      'clear_chat',
      'toggle_enabled',
    ]
    // This test exists purely so a typo in the union type breaks at
    // compile time when this test file is checked. Runtime assertion
    // is just a list-length sanity check.
    expect(actions).toHaveLength(5)
    expect(new Set(actions).size).toBe(actions.length) // no dupes
  })
})
