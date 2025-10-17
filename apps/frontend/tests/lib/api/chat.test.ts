import { chat, type ChatMessage } from '@/lib/api/chat';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

const API_BASE = 'http://localhost:8000/api';

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('chat function', () => {
    it('sends chat request successfully', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Hello! How can I help you today?',
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ messages });
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result).toEqual(mockResponse);
      expect(result.mode).toBe('general');
      expect(result.answer).toBe('Hello! How can I help you today?');
    });

    it('handles multi-turn conversation', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Sure, I can help with that!',
      };

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi! How can I help?' },
        { role: 'user', content: 'I need help with trading' },
      ];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages).toHaveLength(3);
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.answer).toBe('Sure, I can help with that!');
    });

    it('handles system messages', async () => {
      const mockResponse = {
        mode: 'instructed',
        answer: 'Following system instructions',
      };

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful trading assistant' },
        { role: 'user', content: 'What should I do?' },
      ];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].role).toBe('system');
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.mode).toBe('instructed');
    });

    it('handles messages with name field', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Hello John!',
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'My name is John', name: 'John' }];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].name).toBe('John');
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.answer).toBe('Hello John!');
    });

    it('handles response with result field', async () => {
      const mockResponse = {
        mode: 'trading',
        answer: 'Here are the stock prices',
        result: {
          stocks: [
            { symbol: 'AAPL', price: 150.5 },
            { symbol: 'GOOGL', price: 2800.0 },
          ],
        },
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'Show me stock prices' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.result).toBeDefined();
      expect(result.result.stocks).toHaveLength(2);
      expect(result.result.stocks[0].symbol).toBe('AAPL');
    });

    it('handles empty messages array', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'No messages provided',
      };

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages).toHaveLength(0);
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat([]);

      expect(result.answer).toBe('No messages provided');
    });

    it('handles long conversation history', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Processing long conversation',
      };

      const messages: ChatMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i + 1}`,
      }));

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages).toHaveLength(20);
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.answer).toBe('Processing long conversation');
    });

    it('handles messages with special characters', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Understood your message!',
      };

      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello! @#$%^&*() 你好 🚀 <script>alert("test")</script>',
        },
      ];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].content).toContain('🚀');
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.answer).toBe('Understood your message!');
    });

    it('handles very long message content', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Processed long message',
      };

      const longContent = 'a'.repeat(10000);
      const messages: ChatMessage[] = [{ role: 'user', content: longContent }];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].content.length).toBe(10000);
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.answer).toBe('Processed long message');
    });
  });

  describe('Error Handling', () => {
    it('throws error on 400 bad request', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json({ detail: 'Invalid message format' }, { status: 400 });
        })
      );

      await expect(chat(messages)).rejects.toThrow('Invalid message format');
    });

    it('throws error on 401 unauthorized', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json({ detail: 'Authentication required' }, { status: 401 });
        })
      );

      await expect(chat(messages)).rejects.toThrow('Authentication required');
    });

    it('throws error on 429 rate limit', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json({ detail: 'Rate limit exceeded' }, { status: 429 });
        })
      );

      await expect(chat(messages)).rejects.toThrow('Rate limit exceeded');
    });

    it('throws error on 500 server error', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json({ detail: 'Internal server error' }, { status: 500 });
        })
      );

      await expect(chat(messages)).rejects.toThrow('Internal server error');
    });

    it('throws error on network failure', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.error();
        })
      );

      await expect(chat(messages)).rejects.toThrow();
    });

    it('handles malformed JSON response', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return new HttpResponse('Invalid JSON{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      await expect(chat(messages)).rejects.toThrow();
    });

    it('handles empty response body', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return new HttpResponse(null, { status: 200 });
        })
      );

      await expect(chat(messages)).rejects.toThrow();
    });
  });

  describe('Response Modes', () => {
    it('handles general mode', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'General response',
      };

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat([{ role: 'user', content: 'test' }]);

      expect(result.mode).toBe('general');
    });

    it('handles trading mode', async () => {
      const mockResponse = {
        mode: 'trading',
        answer: 'Trading advice',
        result: { action: 'buy', symbol: 'AAPL' },
      };

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat([{ role: 'user', content: 'Should I buy?' }]);

      expect(result.mode).toBe('trading');
      expect(result.result).toBeDefined();
    });

    it('handles analysis mode', async () => {
      const mockResponse = {
        mode: 'analysis',
        answer: 'Market analysis',
        result: {
          trend: 'bullish',
          indicators: ['RSI', 'MACD'],
        },
      };

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat([{ role: 'user', content: 'Analyze the market' }]);

      expect(result.mode).toBe('analysis');
      expect(result.result.trend).toBe('bullish');
    });

    it('handles query mode', async () => {
      const mockResponse = {
        mode: 'query',
        answer: 'Query result',
        result: {
          data: [1, 2, 3],
          count: 3,
        },
      };

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat([{ role: 'user', content: 'Get data' }]);

      expect(result.mode).toBe('query');
      expect(result.result.count).toBe(3);
    });
  });

  describe('Message Types', () => {
    it('validates user role messages', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'User message' }];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].role).toBe('user');
          return HttpResponse.json(mockResponse);
        })
      );

      await chat(messages);
    });

    it('validates assistant role messages', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
      };

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Assistant response' },
      ];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[1].role).toBe('assistant');
          return HttpResponse.json(mockResponse);
        })
      );

      await chat(messages);
    });

    it('validates system role messages', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
      };

      const messages: ChatMessage[] = [
        { role: 'system', content: 'System instruction' },
        { role: 'user', content: 'User message' },
      ];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].role).toBe('system');
          return HttpResponse.json(mockResponse);
        })
      );

      await chat(messages);
    });

    it('handles mixed message types', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
      };

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'How are you?' },
      ];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages).toHaveLength(4);
          expect(body.messages[0].role).toBe('system');
          expect(body.messages[1].role).toBe('user');
          expect(body.messages[2].role).toBe('assistant');
          expect(body.messages[3].role).toBe('user');
          return HttpResponse.json(mockResponse);
        })
      );

      await chat(messages);
    });
  });

  describe('Edge Cases', () => {
    it('handles concurrent chat requests', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
      };

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const promises = [
        chat([{ role: 'user', content: 'Message 1' }]),
        chat([{ role: 'user', content: 'Message 2' }]),
        chat([{ role: 'user', content: 'Message 3' }]),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => expect(result.mode).toBe('general'));
    });

    it('handles response with additional fields', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
        extra_field: 'extra_value',
        metadata: { timestamp: 123456 },
      };

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat([{ role: 'user', content: 'test' }]);

      expect(result.mode).toBe('general');
      // Additional fields should be preserved
      expect((result as any).extra_field).toBe('extra_value');
    });

    it('handles unicode and emoji in messages', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Unicode handled! 你好 🚀',
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello 世界 🌍' }];

      server.use(
        http.post(`${API_BASE}/chat`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await chat(messages);

      expect(result.answer).toContain('🚀');
      expect(result.answer).toContain('你好');
    });

    it('handles newlines and whitespace in content', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'Line 1\nLine 2\n\nLine 3' }];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].content).toContain('\n');
          return HttpResponse.json(mockResponse);
        })
      );

      await chat(messages);
    });

    it('preserves message order', async () => {
      const mockResponse = {
        mode: 'general',
        answer: 'Response',
      };

      const messages: ChatMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'assistant', content: 'Second' },
        { role: 'user', content: 'Third' },
      ];

      server.use(
        http.post(`${API_BASE}/chat`, async ({ request }) => {
          const body = await request.json();
          expect(body.messages[0].content).toBe('First');
          expect(body.messages[1].content).toBe('Second');
          expect(body.messages[2].content).toBe('Third');
          return HttpResponse.json(mockResponse);
        })
      );

      await chat(messages);
    });
  });
});
