import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chat, type ChatMessage } from '@/lib/api/chat';
import * as apiFetchModule from '@/lib/api/apiFetch';

// Mock apiFetch module
vi.mock('@/lib/api/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = apiFetchModule.apiFetch as ReturnType<typeof vi.fn>;

describe('chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('chat function', () => {
    it('should call apiFetch with correct parameters', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];
      const mockResponse = { mode: 'chat', answer: 'Hi there!' };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await chat(messages);

      expect(mockApiFetch).toHaveBeenCalledWith('/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle system message', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'What is Bitcoin?' },
      ];
      const mockResponse = { mode: 'crypto', answer: 'Bitcoin is a cryptocurrency...' };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await chat(messages);

      expect(mockApiFetch).toHaveBeenCalledWith('/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
      expect(result.mode).toBe('crypto');
    });

    it('should handle assistant message', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'What is the price?' },
        { role: 'assistant', content: 'The current price is $50,000' },
        { role: 'user', content: 'Thanks!' },
      ];
      const mockResponse = { mode: 'chat', answer: 'You\'re welcome!' };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await chat(messages);

      expect(result.answer).toBe("You're welcome!");
    });

    it('should handle message with name field', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', name: 'John' },
      ];
      const mockResponse = { mode: 'chat', answer: 'Hello John!' };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      await chat(messages);

      expect(mockApiFetch).toHaveBeenCalledWith('/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
    });

    it('should return response with result field when present', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Get BTC price' },
      ];
      const mockResponse = { 
        mode: 'price', 
        answer: 'BTC is at $50,000',
        result: { symbol: 'BTC', price: 50000 },
      };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await chat(messages);

      expect(result.result).toEqual({ symbol: 'BTC', price: 50000 });
    });

    it('should propagate errors from apiFetch', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      await expect(chat(messages)).rejects.toThrow('Network error');
    });

    it('should handle empty messages array', async () => {
      const messages: ChatMessage[] = [];
      const mockResponse = { mode: 'error', answer: 'No messages provided' };
      mockApiFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await chat(messages);

      expect(mockApiFetch).toHaveBeenCalledWith('/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      });
      expect(result.mode).toBe('error');
    });
  });

  describe('ChatMessage type', () => {
    it('should accept valid user message', () => {
      const message: ChatMessage = { role: 'user', content: 'Hello' };
      expect(message.role).toBe('user');
    });

    it('should accept valid assistant message', () => {
      const message: ChatMessage = { role: 'assistant', content: 'Hi!' };
      expect(message.role).toBe('assistant');
    });

    it('should accept valid system message', () => {
      const message: ChatMessage = { role: 'system', content: 'Instructions' };
      expect(message.role).toBe('system');
    });

    it('should accept message with optional name', () => {
      const message: ChatMessage = { role: 'user', content: 'Hello', name: 'Alice' };
      expect(message.name).toBe('Alice');
    });
  });
});
