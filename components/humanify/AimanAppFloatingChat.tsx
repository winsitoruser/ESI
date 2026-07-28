/**
 * Floating AIMAN chat for authenticated Humanify portal (post-login).
 * Uses /api/humanify/ai-hub with live tenant context.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MessageCircle, X, Send, Sparkles, Minimize2, ExternalLink } from 'lucide-react';
import {
  AIMAN_GREETING,
  AIMAN_SUGGESTIONS,
  AIMAN_THINKING_LABEL,
} from '@/lib/hris/ai-persona';

type PendingAction = { tool: string; label: string; description: string; risk?: string };
type ChatMsg = {
  role: 'user' | 'assistant';
  content: string;
  pendingActions?: PendingAction[];
};

const API = '/api/humanify/ai-hub';

export default function AimanAppFloatingChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pulse, setPulse] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hide on full AI Center page to avoid duplicate panels
  const hideHere = router.pathname.startsWith('/humanify/ai');

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
    if (!text || loading || blocked) return;
    setInput('');
    const pendingTools = [...messages].reverse()
      .find((m) => m.role === 'assistant' && m.pendingActions?.length)?.pendingActions
      ?.map((a) => a.tool) || [];
    const nextHistory = [...messages, { role: 'user' as const, content: text }];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const res = await fetch(`${API}?action=chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          pendingTools,
        }),
      });
      const json = await res.json();
      if (res.status === 403 || json?.code === 'PLAN_FEATURE') {
        setBlocked(true);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Paket Anda belum mencakup AIMAN. Upgrade plan atau buka AI Center setelah fitur AI diaktifkan.',
          },
        ]);
        return;
      }
      const reply = json?.data?.reply || json?.error || 'Maaf, AIMAN sedang sibuk. Coba lagi sebentar.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: String(reply),
          pendingActions: json?.data?.agent?.pendingActions || undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Koneksi terputus. Silakan coba lagi.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, blocked]);

  const confirmAction = useCallback(async (tool: string) => {
    if (confirming) return;
    setConfirming(tool);
    try {
      const res = await fetch(`${API}?action=agent-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool }),
      });
      const json = await res.json();
      const reply = json?.success
        ? (json?.data?.reply || json?.message || `Aksi ${tool} dikonfirmasi.`)
        : (json?.error || 'Konfirmasi gagal');
      setMessages((prev) => [...prev, { role: 'assistant', content: String(reply) }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Gagal mengonfirmasi aksi. Coba lagi dari AI Center.' },
      ]);
    } finally {
      setConfirming(null);
    }
  }, [confirming]);

  if (hideHere) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
        {open && (
          <div
            className="flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-[color:var(--hf-brand-200)] bg-white shadow-2xl"
            style={{ height: 'min(560px, calc(100vh - 6rem))' }}
            role="dialog"
            aria-label="Chat AIMAN"
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{ background: 'linear-gradient(90deg, var(--hf-brand-600), var(--hf-brand-500))' }}
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white ring-2 ring-white/30">
                AI
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[color:var(--hf-brand-600)] bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">AIMAN</p>
                <p className="truncate text-[11px] text-white/85">AI Guide HR · data live tenant</p>
              </div>
              <Link
                href="/humanify/ai?tab=copilot"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                title="Buka AI Center"
                aria-label="Buka AI Center"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Tutup chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3">
              {!messages.length && (
                <div className="rounded-xl border border-[color:var(--hf-brand-100)] bg-white p-3 text-sm text-slate-700">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-brand-600)]">
                    <Sparkles className="h-3.5 w-3.5" /> AIMAN
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {AIMAN_GREETING.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {AIMAN_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] text-slate-700 hover:border-[color:var(--hf-brand-200)] hover:bg-[var(--hf-brand-50)]"
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
                        ? 'rounded-br-md bg-[var(--hf-brand-600)] text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--hf-brand-600)]">AIMAN</p>
                    )}
                    <p className="whitespace-pre-wrap">{m.content.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                    {m.pendingActions && m.pendingActions.length > 0 && (
                      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                        {m.pendingActions.map((a) => (
                          <button
                            key={a.tool}
                            type="button"
                            disabled={!!confirming}
                            onClick={() => confirmAction(a.tool)}
                            className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left text-[11px] text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                          >
                            <span className="font-semibold">{confirming === a.tool ? 'Mengonfirmasi…' : `Konfirmasi: ${a.label}`}</span>
                            {a.description && <span className="mt-0.5 block text-amber-800/80">{a.description}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[color:var(--hf-brand-600)]">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--hf-brand-100)] text-[10px] font-bold animate-pulse">
                    AI
                  </span>
                  <span className="animate-pulse">{AIMAN_THINKING_LABEL}</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-slate-200 bg-white p-3">
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
                  placeholder="Tanya AIMAN tentang SDM..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[color:var(--hf-brand-300)] focus:outline-none focus:ring-1 focus:ring-[color:var(--hf-brand-200)]"
                  disabled={loading || blocked}
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={loading || blocked || !input.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--hf-brand-600)] px-3 text-white hover:opacity-90 disabled:opacity-40"
                  aria-label="Kirim"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                Data live tenant ·{' '}
                <Link href="/humanify/ai?tab=copilot" className="text-[color:var(--hf-brand-600)] underline-offset-2 hover:underline">
                  Buka AI Center
                </Link>
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white/40 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hf-brand-300)]"
          style={{ background: 'linear-gradient(135deg, var(--hf-brand-500), var(--hf-brand-700))' }}
          aria-label={open ? 'Tutup AIMAN' : 'Chat dengan AIMAN'}
        >
          {pulse && !open && (
            <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ background: 'var(--hf-brand-400)' }} />
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
