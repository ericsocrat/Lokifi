import { describe, expect, it } from 'vitest';
import { keyFromEvent } from '../../../src/lib/utils/keys';

describe('keys utilities', () => {
  describe('keyFromEvent', () => {
    // Helper to create mock keyboard events
    const createKeyEvent = (params: {
      key: string;
      ctrlKey?: boolean;
      metaKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
    }): KeyboardEvent => {
      return {
        key: params.key,
        ctrlKey: params.ctrlKey || false,
        metaKey: params.metaKey || false,
        altKey: params.altKey || false,
        shiftKey: params.shiftKey || false,
      } as KeyboardEvent;
    };

    it('should return single letter key uppercase', () => {
      const event = createKeyEvent({ key: 'a' });
      expect(keyFromEvent(event)).toBe('A');
    });

    it('should return Ctrl+key for ctrl modifier', () => {
      const event = createKeyEvent({ key: 's', ctrlKey: true });
      expect(keyFromEvent(event)).toBe('Ctrl+S');
    });

    it('should return Ctrl+key for meta modifier', () => {
      const event = createKeyEvent({ key: 's', metaKey: true });
      expect(keyFromEvent(event)).toBe('Ctrl+S');
    });

    it('should return Alt+key for alt modifier', () => {
      const event = createKeyEvent({ key: 'f', altKey: true });
      expect(keyFromEvent(event)).toBe('Alt+F');
    });

    it('should return Shift+key for shift modifier', () => {
      const event = createKeyEvent({ key: 't', shiftKey: true });
      expect(keyFromEvent(event)).toBe('Shift+T');
    });

    it('should combine multiple modifiers in correct order', () => {
      const event = createKeyEvent({ key: 's', ctrlKey: true, shiftKey: true });
      expect(keyFromEvent(event)).toBe('Ctrl+Shift+S');
    });

    it('should handle Ctrl+Alt+key', () => {
      const event = createKeyEvent({ key: 'd', ctrlKey: true, altKey: true });
      expect(keyFromEvent(event)).toBe('Ctrl+Alt+D');
    });

    it('should handle Ctrl+Alt+Shift+key', () => {
      const event = createKeyEvent({
        key: 'z',
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
      });
      expect(keyFromEvent(event)).toBe('Ctrl+Alt+Shift+Z');
    });

    it('should handle Alt+Shift+key', () => {
      const event = createKeyEvent({ key: 'p', altKey: true, shiftKey: true });
      expect(keyFromEvent(event)).toBe('Alt+Shift+P');
    });

    it('should preserve multi-character key names', () => {
      const event = createKeyEvent({ key: 'Enter' });
      expect(keyFromEvent(event)).toBe('Enter');
    });

    it('should handle Escape key', () => {
      const event = createKeyEvent({ key: 'Escape' });
      expect(keyFromEvent(event)).toBe('Escape');
    });

    it('should handle Tab key', () => {
      const event = createKeyEvent({ key: 'Tab' });
      expect(keyFromEvent(event)).toBe('Tab');
    });

    it('should handle Backspace key', () => {
      const event = createKeyEvent({ key: 'Backspace' });
      expect(keyFromEvent(event)).toBe('Backspace');
    });

    it('should handle Delete key', () => {
      const event = createKeyEvent({ key: 'Delete' });
      expect(keyFromEvent(event)).toBe('Delete');
    });

    it('should handle Arrow keys', () => {
      expect(keyFromEvent(createKeyEvent({ key: 'ArrowUp' }))).toBe('ArrowUp');
      expect(keyFromEvent(createKeyEvent({ key: 'ArrowDown' }))).toBe('ArrowDown');
      expect(keyFromEvent(createKeyEvent({ key: 'ArrowLeft' }))).toBe('ArrowLeft');
      expect(keyFromEvent(createKeyEvent({ key: 'ArrowRight' }))).toBe('ArrowRight');
    });

    it('should handle Function keys', () => {
      expect(keyFromEvent(createKeyEvent({ key: 'F1' }))).toBe('F1');
      expect(keyFromEvent(createKeyEvent({ key: 'F12' }))).toBe('F12');
    });

    it('should handle Space key', () => {
      const event = createKeyEvent({ key: ' ' });
      expect(keyFromEvent(event)).toBe(' ');
    });

    it('should uppercase single lowercase letters', () => {
      expect(keyFromEvent(createKeyEvent({ key: 'q' }))).toBe('Q');
      expect(keyFromEvent(createKeyEvent({ key: 'w' }))).toBe('W');
      expect(keyFromEvent(createKeyEvent({ key: 'z' }))).toBe('Z');
    });

    it('should handle already uppercase letters', () => {
      const event = createKeyEvent({ key: 'A' });
      expect(keyFromEvent(event)).toBe('A');
    });

    it('should handle numbers', () => {
      expect(keyFromEvent(createKeyEvent({ key: '1' }))).toBe('1');
      expect(keyFromEvent(createKeyEvent({ key: '5' }))).toBe('5');
      expect(keyFromEvent(createKeyEvent({ key: '0' }))).toBe('0');
    });

    it('should handle special characters', () => {
      expect(keyFromEvent(createKeyEvent({ key: '!' }))).toBe('!');
      expect(keyFromEvent(createKeyEvent({ key: '@' }))).toBe('@');
      expect(keyFromEvent(createKeyEvent({ key: '#' }))).toBe('#');
    });

    it('should handle Ctrl+number combinations', () => {
      const event = createKeyEvent({ key: '1', ctrlKey: true });
      expect(keyFromEvent(event)).toBe('Ctrl+1');
    });

    it('should handle Ctrl+special character combinations', () => {
      const event = createKeyEvent({ key: '/', ctrlKey: true });
      expect(keyFromEvent(event)).toBe('Ctrl+/');
    });

    it('should prioritize metaKey over ctrlKey (both use Ctrl)', () => {
      const event = createKeyEvent({ key: 's', ctrlKey: true, metaKey: true });
      // Both map to 'Ctrl', so only one 'Ctrl' should appear
      expect(keyFromEvent(event)).toBe('Ctrl+S');
    });

    it('should handle React synthetic keyboard events', () => {
      // React keyboard events have same structure
      const reactEvent = {
        key: 'k',
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as React.KeyboardEvent<HTMLInputElement>;

      expect(keyFromEvent(reactEvent)).toBe('Ctrl+K');
    });

    it('should handle edge case with undefined key', () => {
      const event = createKeyEvent({ key: undefined as any });
      // Undefined key becomes empty string after processing
      const result = keyFromEvent(event);
      expect(result).toBe('');
    });

    it('should handle empty string key', () => {
      const event = createKeyEvent({ key: '' });
      const result = keyFromEvent(event);
      expect(result).toBe('');
    });

    it('should uppercase bracket keys', () => {
      expect(keyFromEvent(createKeyEvent({ key: '[' }))).toBe('[');
      expect(keyFromEvent(createKeyEvent({ key: ']' }))).toBe(']');
    });

    it('should handle modifier-only combinations', () => {
      // Just Ctrl without other key (edge case)
      const event = createKeyEvent({ key: 'Control', ctrlKey: true });
      expect(keyFromEvent(event)).toBe('Ctrl+Control');
    });

    it('should generate consistent strings for common shortcuts', () => {
      // Common IDE shortcuts
      expect(keyFromEvent(createKeyEvent({ key: 's', ctrlKey: true }))).toBe('Ctrl+S'); // Save
      expect(keyFromEvent(createKeyEvent({ key: 'z', ctrlKey: true }))).toBe('Ctrl+Z'); // Undo
      expect(keyFromEvent(createKeyEvent({ key: 'y', ctrlKey: true }))).toBe('Ctrl+Y'); // Redo
      expect(keyFromEvent(createKeyEvent({ key: 'c', ctrlKey: true }))).toBe('Ctrl+C'); // Copy
      expect(keyFromEvent(createKeyEvent({ key: 'v', ctrlKey: true }))).toBe('Ctrl+V'); // Paste
      expect(keyFromEvent(createKeyEvent({ key: 'x', ctrlKey: true }))).toBe('Ctrl+X'); // Cut
      expect(keyFromEvent(createKeyEvent({ key: 'a', ctrlKey: true }))).toBe('Ctrl+A'); // Select all
    });
  });
});
