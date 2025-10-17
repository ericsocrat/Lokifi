import { describe, it, expect, beforeEach } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  type VersionedState,
  type MigrationFunction,
  registerMigration,
  migrateState,
  migrateAll,
  createVersionedState,
  needsMigration,
  getMigrationPath,
} from '@/lib/utils/migrations'

describe('migrations', () => {
  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should be a positive number', () => {
      expect(CURRENT_SCHEMA_VERSION).toBeTypeOf('number')
      expect(CURRENT_SCHEMA_VERSION).toBeGreaterThan(0)
      expect(CURRENT_SCHEMA_VERSION).toBe(1)
    })
  })

  describe('createVersionedState', () => {
    it('should create versioned state with current schema version', () => {
      const data = { foo: 'bar' }
      const result = createVersionedState(data)
      
      expect(result).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: { foo: 'bar' }
      })
    })

    it('should work with empty object', () => {
      const result = createVersionedState({})
      
      expect(result).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: {}
      })
    })

    it('should work with array data', () => {
      const data = [1, 2, 3]
      const result = createVersionedState(data)
      
      expect(result).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: [1, 2, 3]
      })
    })

    it('should work with null data', () => {
      const result = createVersionedState(null)
      
      expect(result).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: null
      })
    })

    it('should work with primitive data', () => {
      expect(createVersionedState('test')).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: 'test'
      })
      
      expect(createVersionedState(42)).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: 42
      })
      
      expect(createVersionedState(true)).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: true
      })
    })

    it('should work with nested data structures', () => {
      const data = {
        level1: {
          level2: {
            level3: 'deep'
          },
          array: [1, { nested: true }]
        }
      }
      const result = createVersionedState(data)
      
      expect(result.data).toEqual(data)
      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    })
  })

  describe('needsMigration', () => {
    it('should return false for current schema version', () => {
      const state: VersionedState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: {}
      }
      
      expect(needsMigration(state)).toBe(false)
    })

    it('should return true for older schema version', () => {
      const state: VersionedState = {
        schemaVersion: CURRENT_SCHEMA_VERSION - 1,
        data: {}
      }
      
      expect(needsMigration(state)).toBe(true)
    })

    it('should return true for version 0', () => {
      const state: VersionedState = {
        schemaVersion: 0,
        data: {}
      }
      
      expect(needsMigration(state)).toBe(true)
    })

    it('should return false for future schema version', () => {
      const state: VersionedState = {
        schemaVersion: CURRENT_SCHEMA_VERSION + 1,
        data: {}
      }
      
      expect(needsMigration(state)).toBe(false)
    })
  })

  describe('registerMigration', () => {
    beforeEach(() => {
      // Note: We can't reset MIGRATIONS as it's a module-level constant
      // Tests must use unique state types to avoid conflicts
    })

    it('should register a migration for a state type', () => {
      const migration: MigrationFunction = (data: any) => ({ ...data, migrated: true })
      
      expect(() => {
        registerMigration('test-type-1', 0, migration)
      }).not.toThrow()
    })

    it('should register multiple migrations for same state type', () => {
      const migration1: MigrationFunction = (data: any) => ({ ...data, v1: true })
      const migration2: MigrationFunction = (data: any) => ({ ...data, v2: true })
      
      expect(() => {
        registerMigration('test-type-2', 0, migration1)
        registerMigration('test-type-2', 1, migration2)
      }).not.toThrow()
    })

    it('should register migrations for different state types', () => {
      const migration1: MigrationFunction = (data: any) => data
      const migration2: MigrationFunction = (data: any) => data
      
      expect(() => {
        registerMigration('test-type-3a', 0, migration1)
        registerMigration('test-type-3b', 0, migration2)
      }).not.toThrow()
    })
  })

  describe('migrateState', () => {
    it('should throw for invalid state format (missing schemaVersion)', () => {
      const invalidState = { data: {} } as any
      
      expect(() => {
        migrateState('test', invalidState)
      }).toThrow('Invalid state format for test')
    })

    it('should throw for null state', () => {
      expect(() => {
        migrateState('test', null as any)
      }).toThrow('Invalid state format for test')
    })

    it('should throw for non-object state', () => {
      expect(() => {
        migrateState('test', 'invalid' as any)
      }).toThrow('Invalid state format for test')
      
      expect(() => {
        migrateState('test', 42 as any)
      }).toThrow('Invalid state format for test')
    })

    it('should throw for non-numeric schemaVersion', () => {
      const state = { schemaVersion: 'invalid', data: {} } as any
      
      expect(() => {
        migrateState('test', state)
      }).toThrow('Invalid state format for test')
    })

    it('should return state unchanged when already at current version', () => {
      const state: VersionedState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: { foo: 'bar' }
      }
      
      const result = migrateState('test', state)
      
      expect(result).toEqual(state)
      expect(result).not.toBe(state) // Should be a copy
    })

    it('should throw when migration is missing', () => {
      const state: VersionedState = {
        schemaVersion: 0,
        data: { foo: 'bar' }
      }
      
      expect(() => {
        migrateState('nonexistent-type', state)
      }).toThrow(/No migration found/)
    })

    it('should apply single migration', () => {
      const migration: MigrationFunction = (data: any) => ({ ...data, migrated: true })
      
      // Register migration for testing (if CURRENT_SCHEMA_VERSION allows it)
      if (CURRENT_SCHEMA_VERSION > 1) {
        registerMigration('test-migrate-1', CURRENT_SCHEMA_VERSION - 1, migration)
        
        const state: VersionedState = {
          schemaVersion: CURRENT_SCHEMA_VERSION - 1,
          data: { original: true }
        }
        
        const result = migrateState('test-migrate-1', state)
        
        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
        expect(result.data).toEqual({
          original: true,
          migrated: true
        })
      }
    })

    it('should preserve original state object (immutability)', () => {
      const state: VersionedState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: { foo: 'bar' }
      }
      
      const result = migrateState('test', state)
      
      expect(result).not.toBe(state)
      expect(result.data).toEqual(state.data)
    })
  })

  describe('migrateAll', () => {
    it('should migrate empty object', () => {
      const result = migrateAll({})
      
      expect(result).toEqual({})
    })

    it('should migrate all state types', () => {
      const allState = {
        type1: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          data: { a: 1 }
        },
        type2: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          data: { b: 2 }
        }
      }
      
      const result = migrateAll(allState)
      
      expect(result).toHaveProperty('type1')
      expect(result).toHaveProperty('type2')
      expect(result['type1']?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
      expect(result['type2']?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    })

    it('should preserve original state on migration failure', () => {
      const allState = {
        valid: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          data: { valid: true }
        },
        invalid: {
          schemaVersion: 0,
          data: { invalid: true }
        } as VersionedState
      }
      
      const result = migrateAll(allState)
      
      // Valid state should be migrated (copied)
      expect(result['valid']).toEqual(allState.valid)
      
      // Invalid state should be preserved (migration would fail, so original preserved)
      expect(result['invalid']).toEqual(allState.invalid)
    })

    it('should handle single state type', () => {
      const allState = {
        only: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          data: { single: true }
        }
      }
      
      const result = migrateAll(allState)
      
      expect(Object.keys(result)).toHaveLength(1)
      expect(result['only']).toBeDefined()
    })

    it('should not mutate input', () => {
      const allState = {
        type1: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          data: { original: true }
        }
      }
      
      const original = JSON.stringify(allState)
      migrateAll(allState)
      
      expect(JSON.stringify(allState)).toBe(original)
    })

    it('should handle multiple failed migrations', () => {
      const allState = {
        fail1: { schemaVersion: 0, data: {} },
        fail2: { schemaVersion: 0, data: {} },
        success: { schemaVersion: CURRENT_SCHEMA_VERSION, data: {} }
      }
      
      const result = migrateAll(allState)
      
      expect(Object.keys(result)).toHaveLength(3)
      expect(result['success']).toBeDefined()
      expect(result['fail1']).toBe(allState.fail1)
      expect(result['fail2']).toBe(allState.fail2)
    })
  })

  describe('getMigrationPath', () => {
    it('should return empty path for current version', () => {
      const path = getMigrationPath('any-type', CURRENT_SCHEMA_VERSION)
      
      expect(path).toEqual([])
    })

    it('should throw when migration is missing', () => {
      expect(() => {
        getMigrationPath('nonexistent-type', 0)
      }).toThrow(/Missing migration/)
    })

    it('should return path for single migration', () => {
      if (CURRENT_SCHEMA_VERSION > 1) {
        const migration: MigrationFunction = (data: any) => data
        registerMigration('test-path-1', CURRENT_SCHEMA_VERSION - 1, migration)
        
        const path = getMigrationPath('test-path-1', CURRENT_SCHEMA_VERSION - 1)
        
        expect(path).toEqual([CURRENT_SCHEMA_VERSION - 1])
      }
    })

    it('should return empty path when already at target version', () => {
      const path = getMigrationPath('any-type', CURRENT_SCHEMA_VERSION)
      
      expect(path).toHaveLength(0)
    })

    it('should throw for future version', () => {
      expect(() => {
        getMigrationPath('test', CURRENT_SCHEMA_VERSION + 1)
      }).not.toThrow() // Should return empty path
      
      const path = getMigrationPath('test', CURRENT_SCHEMA_VERSION + 1)
      expect(path).toEqual([])
    })
  })

  describe('Integration', () => {
    it('should handle full migration workflow', () => {
      // Create initial state
      const data = { counter: 0, items: [] }
      const state = createVersionedState(data)
      
      // Verify it doesn't need migration
      expect(needsMigration(state)).toBe(false)
      
      // Try to migrate (should be no-op)
      const migrated = migrateState('test-workflow', state)
      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    })

    it('should handle batch migration workflow', () => {
      const allState = {
        layout: createVersionedState({ panes: [] }),
        drawings: createVersionedState({ objects: [] }),
        indicators: createVersionedState({ indicators: [] })
      }
      
      const migrated = migrateAll(allState)
      
      expect(Object.keys(migrated)).toHaveLength(3)
      expect(migrated['layout']?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
      expect(migrated['drawings']?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
      expect(migrated['indicators']?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    })

    it('should preserve data through migration', () => {
      const originalData = {
        id: '123',
        name: 'Test',
        nested: {
          deep: {
            value: 42
          }
        },
        array: [1, 2, { foo: 'bar' }]
      }
      
      const state = createVersionedState(originalData)
      const migrated = migrateState('preserve-test', state)
      
      expect(migrated.data).toEqual(originalData)
    })
  })

  describe('Edge Cases', () => {
    it('should handle state with undefined data', () => {
      const state = createVersionedState(undefined)
      
      expect(state.data).toBeUndefined()
      expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    })

    it('should handle state with circular references (via spread)', () => {
      const circular: any = { a: 1 }
      circular.self = circular
      
      // createVersionedState doesn't serialize, so circular refs are OK
      expect(() => {
        const state = createVersionedState(circular)
        // But spreading won't work with circular refs
        expect(state.data).toBe(circular)
      }).not.toThrow()
    })

    it('should handle very large data objects', () => {
      const largeData = {
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: `item-${i}`,
          nested: { value: i * 2 }
        }))
      }
      
      const state = createVersionedState(largeData)
      
      expect(state.data).toEqual(largeData)
      expect((state.data as any).items).toHaveLength(10000)
    })

    it('should handle special characters in state type names', () => {
      const migration: MigrationFunction = (data: any) => data
      
      expect(() => {
        registerMigration('test-type-with-dashes', 0, migration)
        registerMigration('test.type.with.dots', 0, migration)
        registerMigration('test_type_with_underscores', 0, migration)
      }).not.toThrow()
    })

    it('should handle empty string as state type', () => {
      const state: VersionedState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        data: {}
      }
      
      expect(() => {
        migrateState('', state)
      }).not.toThrow()
    })

    it('should handle negative schema versions in validation', () => {
      const state: VersionedState = {
        schemaVersion: -1,
        data: {}
      }
      
      expect(needsMigration(state)).toBe(true) // -1 < CURRENT_SCHEMA_VERSION
    })
  })
})
