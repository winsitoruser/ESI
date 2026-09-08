/**
 * Floating AIMAN chat for authenticated Humanify portal (post-login).
 * Mascot avatar + layered pulse beacon; uses /api/humanify/ai-hub.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { X, Send, Sparkles, Minimize2, ExternalLink, MessageCircle } from 'lucide-react';
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
const MASCOT = '/images/aiman-mascot.png';

function AimanAvatar({
  size = 40,
  pulse = false,
  className = '',
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`aiman-avatar relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {pulse && (
        <>
          <span className="aiman-pulse-ring aiman-pulse-ring--a" aria-hidden />
          <span className="aiman-pulse-ring aiman-pulse-ring--b" aria-hidden />
        </>
      )}
      <span
        className="relative z-[1] overflow-hidden rounded-full ring-2 ring-cyan-300/50"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle at 40% 30%, #1e1b4b 0%, #0f172a 70%)',
        }}
      >
        <Image
          src={MASCOT}
          alt="AIMAN"
          width={size * 2}
          height={size * 2}
          className="h-full w-full object-cover object-[50%_18%] scale-125"
          priority={size >= 56}
        />
      </span>
      <span className="absolute bottom-0.5 right-0.5 z-[2] h-2.5 w-2.5 rounded-full border-2 border-[#1e1b4b] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
    </span>
  );
}

export default function AimanAppFloatingChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pulseStrong, setPulseStrong] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [unreadNudge, setUnreadNudge] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hideHere = router.pathname.startsWith('/humanify/ai');

  useEffect(() => {
    const t = setTimeout(() => setPulseStrong(false), 14000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      setUnreadNudge(false);
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

  const showPulse = !open;

  return (
    <>
      <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 sm:bottom-5 sm:right-5 z-[80] flex flex-col items-end gap-3 max-w-[calc(100vw-1.5rem)]">
        {open && (
          <div
            className="aiman-chat-panel flex w-[min(100vw-1.5rem,390px)] flex-col overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_20px_50px_-12px_rgba(76,29,149,0.35)]"
            style={{ height: 'min(580px, calc(100dvh - 7.5rem))' }}
            role="dialog"
            aria-label="Chat AIMAN"
          >
            <div className="relative overflow-hidden border-b border-violet-500/30 px-4 py-3">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, #4c1d95 0%, #5b21b6 45%, #0e7490 100%)',
                }}
              />
              <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <AimanAvatar size={44} pulse={loading} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">AIMAN</p>
                  <p className="truncate text-[11px] text-cyan-100/90">
                    AI Guide HR · {loading ? 'sedang berpikir…' : 'online · data live tenant'}
                  </p>
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
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-violet-50/80 via-slate-50 to-slate-50 px-3 py-3">
              {!messages.length && (
                <div className="rounded-xl border border-violet-100 bg-white p-3 text-sm text-slate-700 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <AimanAvatar size={32} />
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-brand-600)]">
                      <Sparkles className="h-3.5 w-3.5" /> AIMAN siap membantu
                    </div>
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
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] text-slate-700 hover:border-violet-200 hover:bg-violet-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
                  {m.role === 'assistant' && (
                    <AimanAvatar size={28} className="mt-0.5" />
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-[var(--hf-brand-600)] text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm'
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
                  <AimanAvatar size={28} pulse />
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
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200"
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
                Confirm-required · bukan AI otonom ·{' '}
                <Link href="/humanify/ai?tab=copilot" className="text-[color:var(--hf-brand-600)] underline-offset-2 hover:underline">
                  AI Center
                </Link>
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`aiman-fab group relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
            open ? 'aiman-fab--open' : ''
          } ${pulseStrong && showPulse ? 'aiman-fab--pulse-strong' : ''}`}
          aria-label={open ? 'Tutup AIMAN' : 'Chat dengan AIMAN'}
        >
          {showPulse && (
            <>
              <span className="aiman-fab-pulse aiman-fab-pulse--outer" aria-hidden />
              <span className="aiman-fab-pulse aiman-fab-pulse--mid" aria-hidden />
              <span className="aiman-fab-pulse aiman-fab-pulse--inner" aria-hidden />
            </>
          )}
          <span className="aiman-fab-core relative z-[2] flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-full shadow-[0_8px_28px_rgba(76,29,149,0.45)] ring-2 ring-white/70">
            {open ? (
              <span
                className="flex h-full w-full items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #5b21b6, #0e7490)' }}
              >
                <X className="relative h-7 w-7 text-white" />
              </span>
            ) : (
              <span
                className="relative h-full w-full overflow-hidden"
                style={{ background: 'radial-gradient(circle at 40% 25%, #312e81, #0f172a)' }}
              >
                <Image
                  src={MASCOT}
                  alt=""
                  fill
                  sizes="68px"
                  className="object-cover object-[50%_12%] scale-[1.35]"
                  priority
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-gradient-to-t from-black/55 to-transparent pb-1 pt-3">
                  <MessageCircle className="h-3 w-3 text-cyan-200" />
                </span>
              </span>
            )}
          </span>
          {!open && unreadNudge && (
            <span className="aiman-chat-badge absolute -right-0.5 -top-0.5 z-[3] flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 px-1 text-[9px] font-bold text-slate-900 shadow-md ring-2 ring-white">
              Chat
            </span>
          )}
        </button>
      </div>
    </>
  );
}
