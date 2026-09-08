import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

type Notice = {
  id: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  detail: string;
  href: string;
};

const TONE: Record<Notice['tone'], string> = {
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
};

/**
 * Admin Total notification center — composed from trials, billing, tickets.
 */
export default function OpsNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/platform?action=notifications')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success) setItems(j.data?.items || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const unread = items.length;

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
        aria-label="Notifikasi"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold text-slate-900">Notification center</p>
            <p className="text-[11px] text-slate-500">{unread ? `${unread} sinyal perlu ditinjau` : 'Tidak ada alert'}</p>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">Semua tenang.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-2 px-3 py-2.5 hover:bg-slate-50"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[n.tone]}`} />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-slate-900">{n.title}</span>
                      <span className="block text-[11px] text-slate-500">{n.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
