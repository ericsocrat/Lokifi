/**
 * Tests for log sanitization utility - Security fix for CodeQL alert #915
 * 
 * These tests verify that user-controlled input is properly sanitized
 * before being logged to prevent log injection attacks.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeLogInput } from '@/lib/utils/logger';

describe('sanitizeLogInput - Log Injection Prevention', () => {
  it('should remove newline characters', () => {
    const malicious = 'Error message\nFAKE LOG ENTRY: Admin access granted';
    const sanitized = sanitizeLogInput(malicious);
    
    // Should not contain literal newlines
    expect(sanitized).not.toContain('\n');
    expect(sanitized).toContain('_'); // Newlines replaced with underscore
  });

  it('should remove carriage return characters', () => {
    const malicious = 'Error message\rFAKE LOG ENTRY';
    const sanitized = sanitizeLogInput(malicious);
    
    expect(sanitized).not.toContain('\r');
  });

  it('should remove tab characters', () => {
    const malicious = 'Error\tMessage\tWith\tTabs';
    const sanitized = sanitizeLogInput(malicious);
    
    expect(sanitized).not.toContain('\t');
  });

  it('should remove all control characters (ASCII 0-31)', () => {
    // Test various control characters
    const controlChars = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F';
    const sanitized = sanitizeLogInput(controlChars);
    
    // All control characters should be removed/replaced
    for (let i = 0; i < 32; i++) {
      expect(sanitized).not.toContain(String.fromCharCode(i));
    }
  });

  it('should remove DEL character (ASCII 127)', () => {
    const withDel = 'Message\x7FWith\x7FDEL';
    const sanitized = sanitizeLogInput(withDel);
    
    expect(sanitized).not.toContain('\x7F');
  });

  it('should handle null and undefined inputs', () => {
    expect(sanitizeLogInput(null)).toBe('<null>');
    expect(sanitizeLogInput(undefined)).toBe('<null>');
  });

  it('should convert non-string values to strings', () => {
    expect(sanitizeLogInput(123)).toBe('123');
    expect(sanitizeLogInput(true)).toBe('true');
    expect(sanitizeLogInput({ error: 'test' })).toContain('[object Object]');
  });

  it('should truncate long inputs to prevent log flooding', () => {
    const longString = 'A'.repeat(300);
    const sanitized = sanitizeLogInput(longString, 200);
    
    expect(sanitized.length).toBeLessThanOrEqual(203); // 200 + '...'
    expect(sanitized).toMatch(/\.\.\.$/);
  });

  it('should escape HTML characters to prevent log viewer exploits', () => {
    const htmlContent = '<script>alert("xss")</script>';
    const sanitized = sanitizeLogInput(htmlContent);
    
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).toContain('&lt;');
    expect(sanitized).toContain('&gt;');
  });

  it('should escape quotes to prevent injection', () => {
    const withQuotes = 'Error with "quotes" and \'apostrophes\'';
    const sanitized = sanitizeLogInput(withQuotes);
    
    expect(sanitized).toContain('&quot;');
    expect(sanitized).toContain('&#x27;');
  });

  it('should handle complex log injection attempts', () => {
    // Simulate malicious WebSocket error message attempting log injection
    const maliciousError = 'Connection failed\n[ERROR] Fake system error\n[ADMIN] Unauthorized access granted';
    const sanitized = sanitizeLogInput(maliciousError);
    
    // Should not contain newlines that would create fake log entries
    expect(sanitized).not.toContain('\n');
    expect(sanitized).not.toContain('\r');
    
    // Should have replaced control chars
    const controlCharCount = (sanitized.match(/_/g) || []).length;
    expect(controlCharCount).toBeGreaterThan(0);
  });

  it('should preserve normal alphanumeric content', () => {
    const normal = 'Normal error message 123';
    const sanitized = sanitizeLogInput(normal);
    
    expect(sanitized).toBe(normal);
  });

  it('should handle empty strings', () => {
    expect(sanitizeLogInput('')).toBe('');
  });

  it('should handle strings with only control characters', () => {
    const onlyControl = '\n\r\t\x00\x01';
    const sanitized = sanitizeLogInput(onlyControl);
    
    // Should be replaced with underscores
    expect(sanitized).toBe('_____');
  });
});

describe('sanitizeLogInput - Integration with WebSocket error logging', () => {
  it('should sanitize WebSocket error messages', () => {
    // Simulate the CodeQL alert scenario
    const websocketMessage = {
      type: 'error',
      error: 'Connection failed\nFAKE LOG: System compromised',
    };

    const sanitizedError = sanitizeLogInput(websocketMessage.error);
    
    // The log output should be safe
    expect(sanitizedError).not.toContain('\n');
    expect(sanitizedError).toContain('Connection failed');
    expect(sanitizedError).toContain('FAKE LOG');
  });

  it('should handle error objects with message property', () => {
    const errorObj = new Error('Test\nerror\nmessage');
    const sanitized = sanitizeLogInput(errorObj.message);
    
    expect(sanitized).not.toContain('\n');
  });

  it('should handle error objects directly', () => {
    const errorObj = new Error('Test error');
    const sanitized = sanitizeLogInput(errorObj);
    
    // toString should work
    expect(sanitized).toContain('Error');
  });
});
