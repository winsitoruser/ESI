import { useState, useEffect, useMemo, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import Link from 'next/link';
import {
  Calendar, ChevronLeft, ChevronRight, Heart, Clock,
  DollarSign, Cake, GraduationCap, Briefcase, AlertCircle, X, Flag, Sun
} from 'lucide-react';
import { getIndonesianHolidaysForCalendar, toDateKey } from '@/utils/indonesianHolidays';

type CalEventType =
  | 'leave' | 'shift' | 'payday' | 'training' | 'birthday' | 'contract_end'
  | 'announcement' | 'national_holiday' | 'joint_leave';

interface CalEvent {
  id: string;
  type: CalEventType;
  date: string;
  endDate?: string;
  title: string;
  subtitle?: string;
  employee?: string;
  href?: string;
  color: string;
  icon: typeof Calendar;
}

const TYPE_CONF: Record<CalEventType, { label: string; color: string; icon: typeof Calendar }> = {
  leave: { label: 'Cuti', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Heart },
  shift: { label: 'Shift', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  payday: { label: 'Gajian', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: DollarSign },
  training: { label: 'Training', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: GraduationCap },
  birthday: { label: 'Ultah', color: 'bg-pink-100 text-pink-800 border-pink-300', icon: Cake },
  contract_end: { label: 'Kontrak', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle },
  announcement: { label: 'Pengumuman', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Briefcase },
  national_holiday: { label: 'Libur Nasional', color: 'bg-red-200 text-red-900 border-red-400', icon: Flag },
  joint_leave: { label: 'Cuti Bersama', color: 'bg-orange-200 text-orange-900 border-orange-400', icon: Sun },
};

function buildIndonesiaHolidayEvents(year: number): CalEvent[] {
  return getIndonesianHolidaysForCalendar(year).map((h) => {
    const type: CalEventType = h.category === 'joint_leave' ? 'joint_leave' : 'national_holiday';
    return {
      id: `id-hol-${h.id}`,
      type,
      date: h.date,
      title: h.title,
      subtitle: h.description,
      color: TYPE_CONF[type].color,
      icon: TYPE_CONF[type].icon,
    };
  });
}

export default function HRISCalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [holidaySummary, setHolidaySummary] = useState({ national: 0, jointLeave: 0, total: 0 });
  const [activeFilters, setActiveFilters] = useState<Record<CalEventType, boolean>>({
    leave: true, shift: true, payday: true, training: true, birthday: true,
    contract_end: true, announcement: true, national_holiday: true, joint_leave: true,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const fetchAllEvents = useCallback(async () => {
    setLoading(true);
    const all: CalEvent[] = [...buildIndonesiaHolidayEvents(year)];

    try {
      const holRes = await fetch(`/api/humanify/calendar?action=holidays&year=${year}`);
      if (holRes.ok) {
        const holJson = await holRes.json();
        if (holJson.success && holJson.summary) {
          setHolidaySummary(holJson.summary);
        }
      }
    } catch { /* fallback ke data lokal */ }

    try {
      const [leaveR, trainR, remindR, empR] = await Promise.allSettled([
        fetch('/api/humanify/leave').then((r) => r.json()),
        fetch('/api/humanify/training?action=programs').then((r) => r.json()),
        fetch('/api/humanify/reminders?action=upcoming').then((r) => r.json()),
        fetch('/api/humanify/employees?limit=300').then((r) => r.json()),
      ]);

      if (leaveR.status === 'fulfilled') {
        const list = leaveR.value?.data || leaveR.value?.leaveRequests || [];
        (Array.isArray(list) ? list : []).forEach((l: Record<string, string>) => {
          if (l.status === 'rejected' || l.status === 'cancelled') return;
          all.push({
            id: `leave-${l.id}`, type: 'leave',
            date: l.startDate || l.start_date,
            endDate: l.endDate || l.end_date,
            title: `Cuti: ${l.employeeName || l.employee_name || 'Karyawan'}`,
            subtitle: l.leaveType || l.leave_type,
            href: '/humanify/leave',
            color: TYPE_CONF.leave.color, icon: TYPE_CONF.leave.icon,
          });
        });
      }
      if (trainR.status === 'fulfilled') {
        (trainR.value?.data || []).forEach((p: Record<string, string>) => {
          if (!p.start_date && !p.startDate) return;
          all.push({
            id: `train-${p.id}`, type: 'training',
            date: p.start_date || p.startDate,
            endDate: p.end_date || p.endDate,
            title: `Training: ${p.name || p.title}`,
            subtitle: p.category,
            href: '/humanify/training',
            color: TYPE_CONF.training.color, icon: TYPE_CONF.training.icon,
          });
        });
      }
      if (remindR.status === 'fulfilled') {
        (remindR.value?.data || []).forEach((r: Record<string, string>) => {
          all.push({
            id: `remind-${r.id}`, type: 'contract_end',
            date: r.expiry_date || r.reminder_date || r.expiryDate,
            title: r.title || `Kontrak berakhir: ${r.employee_name || 'Karyawan'}`,
            subtitle: r.notes,
            href: '/humanify/contracts',
            color: TYPE_CONF.contract_end.color, icon: TYPE_CONF.contract_end.icon,
          });
        });
      }
      if (empR.status === 'fulfilled') {
        (empR.value?.data || []).forEach((e: Record<string, string>) => {
          const bd = e.dateOfBirth || e.date_of_birth || e.birthdate;
          if (!bd) return;
          const d = new Date(bd);
          if (isNaN(d.getTime()) || d.getMonth() !== month) return;
          const evDate = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          all.push({
            id: `bd-${e.id}`, type: 'birthday',
            date: evDate,
            title: `Ultah ${e.name}`,
            subtitle: e.position,
            href: `/humanify/employees?id=${e.id}`,
            color: TYPE_CONF.birthday.color, icon: TYPE_CONF.birthday.icon,
          });
        });
      }

      const payDate = `${year}-${String(month + 1).padStart(2, '0')}-28`;
      all.push({
        id: `pay-${payDate}`, type: 'payday', date: payDate,
        title: 'Tanggal Gajian', subtitle: 'Payroll bulanan',
        href: '/humanify/payroll/main',
        color: TYPE_CONF.payday.color, icon: TYPE_CONF.payday.icon,
      });

      const hasHrData = all.some((ev) => !['national_holiday', 'joint_leave', 'payday'].includes(ev.type));
      setDataSource(hasHrData ? 'live' : 'empty');
    } catch (e) {
      console.warn('Calendar fetch error', e);
    }

    setEvents(all);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthLabel = current.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const holidayByDate = useMemo(() => {
    const map: Record<string, { title: string; type: 'national_holiday' | 'joint_leave' }> = {};
    getIndonesianHolidaysForCalendar(year).forEach((h) => {
      map[h.date] = {
        title: h.title,
        type: h.category === 'joint_leave' ? 'joint_leave' : 'national_holiday',
      };
    });
    return map;
  }, [year]);

  const eventsPerDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach((ev) => {
      if (!activeFilters[ev.type]) return;
      const start = new Date(ev.date + 'T12:00:00');
      const end = ev.endDate ? new Date(ev.endDate + 'T12:00:00') : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    });
    return map;
  }, [events, activeFilters]);

  const todayKey = toDateKey(new Date());
  const selectedEvents = selectedDay ? eventsPerDay[selectedDay] || [] : [];

  return (
    <HQLayout title="Kalender HR" subtitle="Libur nasional Indonesia, cuti bersama, cuti karyawan & event HR">
      <div className="space-y-6">
        <div className="flex justify-end">
          <DataSourceBadge source={dataSource} />
        </div>
        {/* Info libur nasional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Flag className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-800">{holidaySummary.national || getIndonesianHolidaysForCalendar(year).filter((h) => h.category === 'national_holiday').length}</p>
              <p className="text-xs text-red-700">Libur Nasional {year}</p>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <Sun className="w-8 h-8 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-orange-800">{holidaySummary.jointLeave || getIndonesianHolidaysForCalendar(year).filter((h) => h.category === 'joint_leave').length}</p>
              <p className="text-xs text-orange-700">Cuti Bersama {year}</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 flex items-center">
            <span>
              Sumber: <strong>SKB 3 Menteri</strong> (Agama, Ketenagakerjaan, PANRB) — libur nasional & cuti bersama resmi Indonesia.
              Akhir pekan (Sab–Min) ditandai abu-abu.
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setCurrent(new Date(year, month - 1, 1))}
              className="p-2 border rounded-lg hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="text-xl font-bold capitalize min-w-[180px] text-center">{monthLabel}</h2>
            <button type="button" onClick={() => setCurrent(new Date(year, month + 1, 1))}
              className="p-2 border rounded-lg hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => setCurrent(new Date())} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Hari ini</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_CONF) as CalEventType[]).map((key) => {
              const conf = TYPE_CONF[key];
              const active = activeFilters[key];
              const Icon = conf.icon;
              return (
                <button key={key} type="button"
                  onClick={() => setActiveFilters((f) => ({ ...f, [key]: !f[key] }))}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition ${active ? conf.color : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                  <Icon className="w-3 h-3" />{conf.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-gray-50 text-xs font-semibold text-gray-600">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
              <div key={d} className={`py-2 text-center ${i === 0 || i === 6 ? 'text-red-500' : ''}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b min-h-[110px] bg-gray-50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsPerDay[key] || [];
              const isToday = key === todayKey;
              const dow = new Date(year, month, day).getDay();
              const isWeekend = dow === 0 || dow === 6;
              const hol = holidayByDate[key];

              let cellBg = '';
              if (hol?.type === 'national_holiday') cellBg = 'bg-red-50';
              else if (hol?.type === 'joint_leave') cellBg = 'bg-orange-50';
              else if (isWeekend) cellBg = 'bg-gray-50';

              return (
                <button key={day} type="button" onClick={() => setSelectedDay(key)}
                  className={`border-r border-b min-h-[110px] p-1.5 text-left hover:bg-blue-50/40 transition relative ${cellBg} ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className={`text-xs font-semibold ${isToday ? 'text-blue-700' : hol ? 'text-red-700' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {hol && (
                      <span className={`text-[9px] px-1 py-0.5 rounded font-medium truncate max-w-[70px] ${
                        hol.type === 'joint_leave' ? 'bg-orange-200 text-orange-900' : 'bg-red-200 text-red-900'
                      }`} title={hol.title}>
                        {hol.type === 'joint_leave' ? 'CB' : 'LN'}
                      </span>
                    )}
                  </div>
                  {hol && (
                    <p className="text-[9px] text-red-800 font-medium leading-tight mb-1 line-clamp-2" title={hol.title}>
                      {hol.title}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {dayEvents.filter((ev) => ev.type !== 'national_holiday' && ev.type !== 'joint_leave').slice(0, hol ? 2 : 3).map((ev) => {
                      const Icon = ev.icon;
                      return (
                        <div key={ev.id} className={`flex items-center gap-1 text-[10px] px-1 py-0.5 rounded border truncate ${ev.color}`}>
                          <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > (hol ? 2 : 3) && (
                      <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - (hol ? 2 : 3)} lainnya</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500 text-center py-2">Memuat event...</div>}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="font-semibold">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button type="button" onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {holidayByDate[selectedDay] && (
                <div className={`flex items-start gap-3 p-4 ${holidayByDate[selectedDay].type === 'joint_leave' ? 'bg-orange-50' : 'bg-red-50'}`}>
                  <Flag className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{holidayByDate[selectedDay].title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {holidayByDate[selectedDay].type === 'joint_leave' ? 'Cuti Bersama (SKB 3 Menteri)' : 'Libur Nasional Indonesia'}
                    </p>
                  </div>
                </div>
              )}
              {selectedEvents.filter((ev) => ev.type !== 'national_holiday' && ev.type !== 'joint_leave').length === 0 && !holidayByDate[selectedDay] ? (
                <div className="p-6 text-center text-sm text-gray-500">Tidak ada event HR pada hari ini</div>
              ) : (
                selectedEvents
                  .filter((ev) => ev.type !== 'national_holiday' && ev.type !== 'joint_leave')
                  .map((ev) => {
                    const Icon = ev.icon;
                    return (
                      <Link key={ev.id} href={ev.href || '#'} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
                        <div className={`p-2 rounded-lg ${ev.color}`}><Icon className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                          {ev.subtitle && <p className="text-xs text-gray-500 mt-0.5">{ev.subtitle}</p>}
                        </div>
                      </Link>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
