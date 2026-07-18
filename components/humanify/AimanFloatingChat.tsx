/**
 * Floating AIMAN chat widget for Humanify marketing landing.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Minimize2 } from 'lucide-react';
import {
  AIMAN_PUBLIC_GREETING,
  AIMAN_PUBLIC_SUGGESTIONS,
  AIMAN_THINKING_LABEL,
} from '@/lib/hris/ai-persona';
import Link from 'next/link';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function AimanFloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pulse, setPulse] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages, loading]);

  const send = useCallback(async (preset?: string) => {
    const text = (preset || input).trim();
    if (!text || loading) return;
    setInput('');
    const nextHistory = [...messages, { role: 'user' as const, content: text }];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/aiman-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();
      const reply = json?.data?.reply || json?.error || 'Maaf, AIMAN sedang sibuk. Coba lagi sebentar.';
      setMessages((prev) => [...prev, { role: 'assistant', content: String(reply) }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Koneksi terputus. Silakan coba lagi atau daftar trial untuk chat AIMAN penuh.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
        {open && (
          <div
            className="flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-violet-400/30 bg-slate-950/95 shadow-2xl shadow-violet-950/50 backdrop-blur-xl"
            style={{ height: 'min(560px, calc(100vh - 6rem))' }}
            role="dialog"
            aria-label="Chat AIMAN"
          >
            <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-2 ring-white/30">
                AI
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-violet-600 bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">AIMAN</p>
                <p className="truncate text-[11px] text-violet-100/90">AI Guide HR · Humanify</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Tutup chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {!messages.length && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-50">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" /> AIMAN
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-violet-50/95">
                    {AIMAN_PUBLIC_GREETING.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {AIMAN_PUBLIC_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-violet-400/30 bg-slate-900/60 px-2.5 py-1 text-left text-[11px] text-violet-100 hover:bg-violet-500/20"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-violet-600 text-white'
                        : 'rounded-bl-md border border-white/10 bg-white/5 text-violet-50'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-violet-300">AIMAN</p>
                    )}
                    <p className="whitespace-pre-wrap">{m.content.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-violet-300">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/40 text-[10px] font-bold text-white animate-pulse">
                    AI
                  </span>
                  <span className="animate-pulse">{AIMAN_THINKING_LABEL}</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-white/10 bg-slate-950/80 p-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Tanya AIMAN tentang Humanify..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-violet-200/40 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-3 text-white hover:bg-violet-500 disabled:opacity-40"
                  aria-label="Kirim"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-violet-200/40">
                Demo publik ·{' '}
                <Link href={HUMANIFY_BRAND.signupPath || '/humanify/signup'} className="text-violet-300 underline-offset-2 hover:underline">
                  Daftar trial
                </Link>
                {' '}untuk AIMAN + data live
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-900/40 ring-2 ring-white/20 transition hover:scale-105 hover:shadow-violet-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          aria-label={open ? 'Tutup AIMAN' : 'Chat dengan AIMAN'}
        >
          {pulse && !open && (
            <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/40" />
          )}
          {open ? <X className="relative h-6 w-6" /> : <MessageCircle className="relative h-6 w-6" />}
          {!open && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-bold text-slate-900">
              AI
            </span>
          )}
        </button>
      </div>
    </>
  );
}
