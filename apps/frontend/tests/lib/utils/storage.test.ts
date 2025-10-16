import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveJSON, loadJSON } from '@/lib/utils/storage';

describe('storage utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('saveJSON', () => {
    it('should save primitive values to localStorage', () => {
      saveJSON('test-string', 'hello');
      expect(localStorage.getItem('test-string')).toBe('"hello"');

      saveJSON('test-number', 42);
      expect(localStorage.getItem('test-number')).toBe('42');

      saveJSON('test-boolean', true);
      expect(localStorage.getItem('test-boolean')).toBe('true');

      saveJSON('test-null', null);
      expect(localStorage.getItem('test-null')).toBe('null');
    });

    it('should save objects to localStorage', () => {
      const testObj = { name: 'John', age: 30 };
      saveJSON('test-object', testObj);
      
      const stored = localStorage.getItem('test-object');
      expect(stored).toBe('{"name":"John","age":30}');
      expect(JSON.parse(stored!)).toEqual(testObj);
    });

    it('should save arrays to localStorage', () => {
      const testArray = [1, 2, 3, 'four'];
      saveJSON('test-array', testArray);
      
      const stored = localStorage.getItem('test-array');
      expect(stored).toBe('[1,2,3,"four"]');
      expect(JSON.parse(stored!)).toEqual(testArray);
    });

    it('should save nested objects to localStorage', () => {
      const nestedObj = {
        user: { name: 'Jane', settings: { theme: 'dark' } },
        data: [1, 2, 3],
      };
      saveJSON('test-nested', nestedObj);
      
      const stored = localStorage.getItem('test-nested');
      expect(JSON.parse(stored!)).toEqual(nestedObj);
    });

    it('should overwrite existing values', () => {
      saveJSON('test-key', 'first');
      expect(localStorage.getItem('test-key')).toBe('"first"');
      
      saveJSON('test-key', 'second');
      expect(localStorage.getItem('test-key')).toBe('"second"');
    });

    it('should handle empty strings', () => {
      saveJSON('test-empty', '');
      expect(localStorage.getItem('test-empty')).toBe('""');
    });

    it('should handle empty objects', () => {
      saveJSON('test-empty-obj', {});
      expect(localStorage.getItem('test-empty-obj')).toBe('{}');
    });

    it('should handle empty arrays', () => {
      saveJSON('test-empty-arr', []);
      expect(localStorage.getItem('test-empty-arr')).toBe('[]');
    });

    it('should handle special characters in key', () => {
      const specialKeys = ['key-with-dash', 'key_with_underscore', 'key.with.dot', 'key:with:colon'];
      
      specialKeys.forEach(key => {
        saveJSON(key, 'value');
        expect(localStorage.getItem(key)).toBe('"value"');
      });
    });

    it('should handle special characters in values', () => {
      const specialValues = {
        unicode: '你好世界',
        emoji: '🎉🚀',
        quotes: 'He said "hello"',
        newlines: 'line1\nline2',
      };
      
      saveJSON('test-special', specialValues);
      const stored = localStorage.getItem('test-special');
      expect(JSON.parse(stored!)).toEqual(specialValues);
    });

    it('should handle Date objects (serialized as ISO strings)', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      saveJSON('test-date', date);
      
      const stored = localStorage.getItem('test-date');
      expect(stored).toBe('"2024-01-01T00:00:00.000Z"');
    });

    it('should handle complex nested structures', () => {
      const complex = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, { nested: true }],
              value: 'deep',
            },
          },
        },
      };
      
      saveJSON('test-complex', complex);
      const stored = localStorage.getItem('test-complex');
      expect(JSON.parse(stored!)).toEqual(complex);
    });

    it('should handle large objects', () => {
      const largeObj = { data: new Array(1000).fill({ value: 'test' }) };
      
      expect(() => {
        saveJSON('test-large', largeObj);
      }).not.toThrow();
      
      const stored = localStorage.getItem('test-large');
      expect(JSON.parse(stored!)).toEqual(largeObj);
    });
  });

  describe('loadJSON', () => {
    it('should load primitive values from localStorage', () => {
      localStorage.setItem('test-string', '"hello"');
      expect(loadJSON('test-string', '')).toBe('hello');

      localStorage.setItem('test-number', '42');
      expect(loadJSON('test-number', 0)).toBe(42);

      localStorage.setItem('test-boolean', 'true');
      expect(loadJSON('test-boolean', false)).toBe(true);

      localStorage.setItem('test-null', 'null');
      expect(loadJSON('test-null', 'fallback')).toBe(null);
    });

    it('should load objects from localStorage', () => {
      const testObj = { name: 'John', age: 30 };
      localStorage.setItem('test-object', JSON.stringify(testObj));
      
      expect(loadJSON('test-object', {})).toEqual(testObj);
    });

    it('should load arrays from localStorage', () => {
      const testArray = [1, 2, 3, 'four'];
      localStorage.setItem('test-array', JSON.stringify(testArray));
      
      expect(loadJSON('test-array', [])).toEqual(testArray);
    });

    it('should return fallback when key does not exist', () => {
      expect(loadJSON('nonexistent', 'fallback')).toBe('fallback');
      expect(loadJSON('nonexistent', 42)).toBe(42);
      expect(loadJSON('nonexistent', { default: true })).toEqual({ default: true });
      expect(loadJSON('nonexistent', [1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should return fallback when value is invalid JSON', () => {
      localStorage.setItem('invalid-json', 'not valid json {[}');
      expect(loadJSON('invalid-json', 'fallback')).toBe('fallback');
    });

    it('should return fallback when value is empty string', () => {
      localStorage.setItem('empty', '');
      expect(loadJSON('empty', 'fallback')).toBe('fallback');
    });

    it('should handle null as a valid stored value', () => {
      localStorage.setItem('null-value', 'null');
      expect(loadJSON('null-value', 'fallback')).toBe(null);
    });

    it('should handle undefined fallback', () => {
      const result = loadJSON('nonexistent', undefined);
      expect(result).toBeUndefined();
    });

    it('should handle complex fallback objects', () => {
      const fallback = {
        nested: { value: 'default' },
        array: [1, 2, 3],
      };
      
      expect(loadJSON('nonexistent', fallback)).toEqual(fallback);
    });

    it('should handle loading after saveJSON', () => {
      const testData = { id: 1, name: 'Test', values: [1, 2, 3] };
      saveJSON('test-key', testData);
      
      const loaded = loadJSON('test-key', {});
      expect(loaded).toEqual(testData);
    });

    it('should preserve type information for primitives', () => {
      saveJSON('string', 'hello');
      saveJSON('number', 42);
      saveJSON('boolean', true);
      
      expect(typeof loadJSON('string', '')).toBe('string');
      expect(typeof loadJSON('number', 0)).toBe('number');
      expect(typeof loadJSON('boolean', false)).toBe('boolean');
    });

    it('should handle special characters in stored values', () => {
      const specialValues = {
        unicode: '你好世界',
        emoji: '🎉🚀',
        quotes: 'He said "hello"',
        newlines: 'line1\nline2',
      };
      
      saveJSON('test-special', specialValues);
      expect(loadJSON('test-special', {})).toEqual(specialValues);
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedValues = [
        '{incomplete',
        '[array without end',
        'undefined',
        'NaN',
        'Infinity',
      ];
      
      malformedValues.forEach((value, index) => {
        localStorage.setItem(`malformed-${index}`, value);
        expect(loadJSON(`malformed-${index}`, 'safe')).toBe('safe');
      });
    });

    it('should handle large stored values', () => {
      const largeObj = { data: new Array(1000).fill({ value: 'test' }) };
      saveJSON('large', largeObj);
      
      const loaded = loadJSON('large', {});
      expect(loaded).toEqual(largeObj);
    });
  });

  describe('integration scenarios', () => {
    it('should support save and load workflow', () => {
      const testData = { user: 'Alice', preferences: { theme: 'dark' } };
      
      saveJSON('app-state', testData);
      const loaded = loadJSON('app-state', {});
      
      expect(loaded).toEqual(testData);
    });

    it('should handle multiple keys independently', () => {
      saveJSON('key1', 'value1');
      saveJSON('key2', 'value2');
      saveJSON('key3', 'value3');
      
      expect(loadJSON('key1', '')).toBe('value1');
      expect(loadJSON('key2', '')).toBe('value2');
      expect(loadJSON('key3', '')).toBe('value3');
    });

    it('should handle overwrites correctly', () => {
      saveJSON('data', { version: 1 });
      expect(loadJSON('data', {})). toEqual({ version: 1 });
      
      saveJSON('data', { version: 2 });
      expect(loadJSON('data', {})).toEqual({ version: 2 });
    });

    it('should work with TypeScript generic types', () => {
      interface User {
        id: number;
        name: string;
      }
      
      const user: User = { id: 1, name: 'Alice' };
      saveJSON<User>('user', user);
      
      const loaded = loadJSON<User>('user', { id: 0, name: '' });
      expect(loaded).toEqual(user);
      expect(loaded.id).toBe(1);
      expect(loaded.name).toBe('Alice');
    });

    it('should handle clearing and reloading', () => {
      saveJSON('temp', 'data');
      expect(loadJSON('temp', 'fallback')).toBe('data');
      
      localStorage.clear();
      expect(loadJSON('temp', 'fallback')).toBe('fallback');
    });

    it('should handle concurrent save/load operations', () => {
      const operations = [
        () => saveJSON('key1', 'value1'),
        () => loadJSON('key1', 'fallback1'),
        () => saveJSON('key2', 'value2'),
        () => loadJSON('key2', 'fallback2'),
      ];
      
      expect(() => {
        operations.forEach(op => op());
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very long keys', () => {
      const longKey = 'k'.repeat(1000);
      saveJSON(longKey, 'value');
      expect(loadJSON(longKey, '')).toBe('value');
    });

    it('should handle empty key', () => {
      saveJSON('', 'value');
      expect(loadJSON('', 'fallback')).toBe('value');
    });

    it('should handle keys with only whitespace', () => {
      saveJSON('   ', 'value');
      expect(loadJSON('   ', 'fallback')).toBe('value');
    });

    it('should handle circular reference fallback objects', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      
      // Can't save circular, but can use as fallback
      expect(loadJSON('nonexistent', circular)).toBe(circular);
    });

    it('should handle Symbol keys (converted to string)', () => {
      const symbolKey = Symbol('test').toString();
      saveJSON(symbolKey, 'value');
      expect(loadJSON(symbolKey, 'fallback')).toBe('value');
    });

    it('should handle numeric keys (converted to string)', () => {
      const numericKey = '123';
      saveJSON(numericKey, 'value');
      expect(loadJSON(numericKey, 'fallback')).toBe('value');
    });

    it('should handle keys with special JSON characters', () => {
      const specialKey = 'key"with\'quotes';
      saveJSON(specialKey, 'value');
      expect(loadJSON(specialKey, 'fallback')).toBe('value');
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully in loadJSON', () => {
      // Mock getItem to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(loadJSON('error-key', 'fallback')).toBe('fallback');
      
      // Restore
      localStorage.getItem = originalGetItem;
    });

    it('should handle JSON.parse errors in loadJSON', () => {
      // Store corrupted JSON that will fail parsing
      localStorage.setItem('corrupted', '{invalid json}');
      
      expect(loadJSON('corrupted', 'safe')).toBe('safe');
    });

    it('should not throw on saveJSON with valid data', () => {
      expect(() => {
        saveJSON('test', { data: 'value' });
        saveJSON('test2', [1, 2, 3]);
        saveJSON('test3', 'string');
        saveJSON('test4', 42);
        saveJSON('test5', true);
        saveJSON('test6', null);
      }).not.toThrow();
    });
  });
});
