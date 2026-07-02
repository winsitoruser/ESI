import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import Link from 'next/link';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Filter, Users, Clock,
  DollarSign, Cake, GraduationCap, Briefcase, Heart, AlertCircle, CheckCircle, X
} from 'lucide-react';

type CalEventType = 'leave' | 'shift' | 'payday' | 'training' | 'birthday' | 'contract_end' | 'announcement' | 'holiday';

interface CalEvent {
  id: string;
  type: CalEventType;
  date: string; // YYYY-MM-DD
  endDate?: string;
  title: string;
  subtitle?: string;
  employee?: string;
  branch?: string;
  href?: string;
  color: string;
  icon: any;
}

const TYPE_CONF: Record<CalEventType, { label: string; color: string; icon: any }> = {
  leave: { label: 'Cuti', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Heart },
  shift: { label: 'Shift', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  payday: { label: 'Gajian', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: DollarSign },
  training: { label: 'Training', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: GraduationCap },
  birthday: { label: 'Ultah', color: 'bg-pink-100 text-pink-800 border-pink-300', icon: Cake },
  contract_end: { label: 'Kontrak', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle },
  announcement: { label: 'Pengumuman', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Briefcase },
  holiday: { label: 'Libur', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: Calendar },
};

export default function HRISCalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<CalEventType, boolean>>({
    leave: true, shift: true, payday: true, training: true, birthday: true,
    contract_end: true, announcement: true, holiday: true
  });
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchAllEvents();
  }, [current]);

  async function fetchAllEvents() {
    setLoading(true);
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
    const all: CalEvent[] = [];
    try {
      const [leaveR, trainR, remindR, empR, holidaysR] = await Promise.allSettled([
        fetch('/api/hq/hris/leave').then(r => r.json()),
        fetch('/api/hq/hris/training?action=programs').then(r => r.json()),
        fetch('/api/hq/hris/reminders?action=upcoming').then(r => r.json()),
        fetch('/api/hq/hris/employees?limit=300').then(r => r.json()),
        fetch(`/api/hq/hris/attendance?period=${firstDay.slice(0, 7)}`).then(r => r.json()),
      ]);
      if (leaveR.status === 'fulfilled') {
        const list = leaveR.value?.data || leaveR.value?.leaveRequests || [];
        (Array.isArray(list) ? list : []).forEach((l: any) => {
          if (l.status === 'rejected' || l.status === 'cancelled') return;
          all.push({
            id: `leave-${l.id}`, type: 'leave',
            date: l.startDate || l.start_date,
            endDate: l.endDate || l.end_date,
            title: `Cuti: ${l.employeeName || l.employee_name || 'Karyawan'}`,
            subtitle: l.leaveType || l.leave_type,
            employee: l.employeeName,
            href: '/hq/hris/leave',
            color: TYPE_CONF.leave.color, icon: TYPE_CONF.leave.icon
          });
        });
      }
      if (trainR.status === 'fulfilled') {
        const list = trainR.value?.data || [];
        (Array.isArray(list) ? list : []).forEach((p: any) => {
          if (!p.start_date && !p.startDate) return;
          all.push({
            id: `train-${p.id}`, type: 'training',
            date: p.start_date || p.startDate,
            endDate: p.end_date || p.endDate,
            title: `Training: ${p.name || p.title}`,
            subtitle: p.category,
            href: '/hq/hris/training',
            color: TYPE_CONF.training.color, icon: TYPE_CONF.training.icon
          });
        });
      }
      if (remindR.status === 'fulfilled') {
        const list = remindR.value?.data || [];
        (Array.isArray(list) ? list : []).forEach((r: any) => {
          all.push({
            id: `remind-${r.id}`, type: 'contract_end',
            date: r.expiry_date || r.reminder_date || r.expiryDate,
            title: r.title || `Kontrak berakhir: ${r.employee_name || 'Karyawan'}`,
            subtitle: r.notes,
            href: '/hq/hris/contracts',
            color: TYPE_CONF.contract_end.color, icon: TYPE_CONF.contract_end.icon
          });
        });
      }
      if (empR.status === 'fulfilled') {
        const list = empR.value?.data || [];
        (Array.isArray(list) ? list : []).forEach((e: any) => {
          const bd = e.dateOfBirth || e.date_of_birth || e.birthdate;
          if (!bd) return;
          const d = new Date(bd);
          if (isNaN(d.getTime())) return;
          const evDate = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (d.getMonth() === month) {
            all.push({
              id: `bd-${e.id}`, type: 'birthday',
              date: evDate,
              title: `🎂 Ultah ${e.name}`,
              subtitle: e.position,
              employee: e.name,
              href: `/hq/hris/employees?id=${e.id}`,
              color: TYPE_CONF.birthday.color, icon: TYPE_CONF.birthday.icon
            });
          }
        });
      }
      // Payday - default 28th
      const payDate = `${year}-${String(month + 1).padStart(2, '0')}-28`;
      all.push({
        id: `pay-${payDate}`, type: 'payday', date: payDate,
        title: 'Tanggal Gajian', subtitle: 'Payroll bulanan',
        href: '/hq/hris/payroll/main',
        color: TYPE_CONF.payday.color, icon: TYPE_CONF.payday.icon
      });
    } catch (e) {
      console.warn('Calendar fetch error', e);
    }
    setEvents(all);
    setLoading(false);
  }

  const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(current.getFullYear(), current.getMonth(), 1).getDay();
  const monthLabel = current.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const eventsPerDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach((ev) => {
      if (!activeFilters[ev.type]) return;
      const start = new Date(ev.date);
      const end = ev.endDate ? new Date(ev.endDate) : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    });
    return map;
  }, [events, activeFilters]);

  const todayKey = new Date().toISOString().slice(0, 10);

  if (!mounted) return null;

  const selectedEvents = selectedDay ? eventsPerDay[selectedDay] || [] : [];

  return (
    <HQLayout title="Kalender HR" subtitle="Cuti, shift, gajian, training & event dalam satu kalender">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="p-2 border rounded-lg hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="text-xl font-bold capitalize min-w-[180px] text-center">{monthLabel}</h2>
            <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="p-2 border rounded-lg hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setCurrent(new Date())} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Hari ini</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_CONF) as CalEventType[]).map((key) => {
              const conf = TYPE_CONF[key];
              const active = activeFilters[key];
              const Icon = conf.icon;
              return (
                <button key={key}
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
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
              <div key={d} className="py-2 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b min-h-[110px] bg-gray-50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsPerDay[key] || [];
              const isToday = key === todayKey;
              return (
                <button key={day} onClick={() => setSelectedDay(key)}
                  className={`border-r border-b min-h-[110px] p-1.5 text-left hover:bg-blue-50/40 transition relative ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const Icon = ev.icon;
                      return (
                        <div key={ev.id} className={`flex items-center gap-1 text-[10px] px-1 py-0.5 rounded border truncate ${ev.color}`}>
                          <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 3} lainnya</div>
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
              <h3 className="font-semibold">Event {new Date(selectedDay).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {selectedEvents.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">Tidak ada event pada hari ini</div>
              ) : (
                selectedEvents.map((ev) => {
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
