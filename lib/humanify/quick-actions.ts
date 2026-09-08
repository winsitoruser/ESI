/**
 * Shared quick-action shortcuts for the Humanify ops dock.
 * F5 / F11 / F12 are skipped — they collide with browser refresh, fullscreen, and DevTools.
 */

export type QuickActionId =
  | 'add-employee'
  | 'attendance'
  | 'payroll'
  | 'recruitment'
  | 'kpi'
  | 'announcements'
  | 'calendar'
  | 'reports';

export type QuickActionDef = {
  id: QuickActionId;
  href: string;
  labelKey: string;
  fallbackLabel: string;
  /** Function-key label shown in the dock, e.g. F1 */
  shortcut: `F${1 | 2 | 3 | 4 | 6 | 7 | 8 | 9}`;
  /** Digit paired with Alt as a more reliable alias (macOS Fn-row). */
  altDigit: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
  tourId?: string;
};

export const HUMANIFY_QUICK_ACTIONS: readonly QuickActionDef[] = [
  {
    id: 'add-employee',
    href: '/humanify/employees?add=1',
    labelKey: 'hris.addEmployee',
    fallbackLabel: 'Tambah Karyawan',
    shortcut: 'F1',
    altDigit: '1',
    tourId: 'hf-tour-employees',
  },
  {
    id: 'attendance',
    href: '/humanify/attendance',
    labelKey: 'hris.inputAttendance',
    fallbackLabel: 'Input Kehadiran',
    shortcut: 'F2',
    altDigit: '2',
  },
  {
    id: 'payroll',
    href: '/humanify/payroll/main',
    labelKey: 'hris.processPayroll',
    fallbackLabel: 'Proses Penggajian',
    shortcut: 'F3',
    altDigit: '3',
  },
  {
    id: 'recruitment',
    href: '/humanify/recruitment',
    labelKey: 'hris.openVacancy',
    fallbackLabel: 'Buka Lowongan',
    shortcut: 'F4',
    altDigit: '4',
  },
  {
    id: 'kpi',
    href: '/humanify/kpi',
    labelKey: 'hris.createKpi',
    fallbackLabel: 'Buat KPI',
    shortcut: 'F6',
    altDigit: '5',
  },
  {
    id: 'announcements',
    href: '/humanify/announcements',
    labelKey: 'hris.sendAnnouncement',
    fallbackLabel: 'Kirim Pengumuman',
    shortcut: 'F7',
    altDigit: '6',
  },
  {
    id: 'calendar',
    href: '/humanify/calendar',
    labelKey: 'hris.hrCalendar',
    fallbackLabel: 'Kalender HR',
    shortcut: 'F8',
    altDigit: '7',
  },
  {
    id: 'reports',
    href: '/humanify/reports',
    labelKey: 'hris.hrisReports',
    fallbackLabel: 'Laporan HRIS',
    shortcut: 'F9',
    altDigit: '8',
  },
] as const;

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (TYPING_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  return false;
}

export function matchQuickActionShortcut(e: KeyboardEvent): QuickActionDef | null {
  if (e.repeat || isTypingTarget(e.target)) return null;
  if (e.metaKey || e.ctrlKey) return null;

  if (e.altKey && !e.shiftKey) {
    const digit = e.code.startsWith('Digit') ? e.code.slice(5) : e.key;
    return HUMANIFY_QUICK_ACTIONS.find((a) => a.altDigit === digit) || null;
  }

  if (e.altKey || e.shiftKey) return null;

  const fKey = /^F\d{1,2}$/.test(e.code) ? e.code : /^F\d{1,2}$/.test(e.key) ? e.key.toUpperCase() : null;
  if (!fKey) return null;
  return HUMANIFY_QUICK_ACTIONS.find((a) => a.shortcut === fKey) || null;
}

export const QUICK_DOCK_STORAGE_KEY = 'humanify-quick-dock:collapsed';
