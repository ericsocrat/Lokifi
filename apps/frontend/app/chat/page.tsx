'use client';

import { useAuth } from '@/src/components/AuthProvider';
import { chat, type ChatMessage } from '@/src/lib/api/chat';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'You are Lokifi, a helpful market assistant.' },
  ]);
  const [input, setInput] = useState('/price BTCUSD 1h');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!input.trim() || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user' as const, content: input }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await chat(next);
      setMessages([...next, { role: 'assistant' as const, content: res.answer || '(no answer)' }]);
      // scroll to bottom
      setTimeout(() => boxRef.current?.scrollTo(0, boxRef.current.scrollHeight), 0);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed';
      setMessages([...next, { role: 'assistant' as const, content: errorMessage }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setTimeout(() => boxRef.current?.scrollTo(0, boxRef.current.scrollHeight), 0);
  }, []);

  return (
    <main role="main" aria-label="AI Chat page" className="space-y-4">
      <h1 className="text-2xl font-semibold">AI Chat</h1>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
        <div
          ref={boxRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="max-h-[60vh] overflow-auto p-4 space-y-3"
        >
          {messages
            .filter((m: ChatMessage) => m.role !== 'system')
            .map((m: ChatMessage, i: number) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block px-3 py-2 rounded-xl ${m.role === 'user' ? 'bg-sky-600' : 'bg-neutral-800'} max-w-[80%]`}
                >
                  <pre className="whitespace-pre-wrap text-sm">{m.content}</pre>
                </div>
              </div>
            ))}
        </div>
        <div
          className="border-t border-neutral-800 p-3 flex gap-2"
          aria-busy={busy}
          aria-live="polite"
        >
          <input
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700"
            placeholder="Ask: /price BTCUSD 1h | /alert BTCUSD above 45000 | /portfolio"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            aria-label="Chat prompt"
          />
          <button
            onClick={send}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
            aria-label={busy ? 'Sending message' : 'Send message'}
          >
            {busy ? '...' : 'Send'}
          </button>
        </div>
        <div className="sr-only" aria-live="polite">
          {busy ? 'Sending message' : 'Ready for input'}
        </div>
      </div>
      <p className="text-sm text-neutral-400">
        {user ? (
          <>
            Logged in as <b>@{user.username || user.email}</b>. You can use <code>/portfolio</code>{' '}
            and create alerts.
          </>
        ) : (
          <>
            Not logged in.{' '}
            <Link href="/login" className="underline">
              Login
            </Link>{' '}
            to access portfolio tools.
          </>
        )}
      </p>
    </main>
  );
}
