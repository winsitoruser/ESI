import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Flag, Target, CheckSquare } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string | Date;
  endDate?: string | Date;
  type?: 'task' | 'milestone' | 'project' | 'deadline';
  status?: string;
  color?: string;
}

interface Props {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  title?: string;
}

const TYPE_CONFIG: Record<string, { bg: string; icon: React.ElementType }> = {
  milestone: { bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: Flag },
  project: { bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: Target },
  task: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckSquare },
  deadline: { bg: 'bg-red-100 text-red-800 border-red-300', icon: CalIcon },
};

export default function CalendarView({ events, onEventClick, title = 'Kalender Proyek' }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { firstDay, daysInMonth, daysInPrevMonth } = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const prevLast = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    return { firstDay: first.getDay(), daysInMonth: last.getDate(), daysInPrevMonth: prevLast.getDate() };
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const cells: { day: number; currentMonth: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, daysInPrevMonth - i) });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, currentMonth: true, date: new Date(currentDate.getFullYear(), currentDate.getMonth(), d) });
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - firstDay - daysInMonth + 1;
    cells.push({ day: nextDay, currentMonth: false, date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, nextDay) });
  }

  const today = new Date();
  const isToday = (d: Date) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-semibold text-gray-700 min-w-[140px] text-center">
            {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="ml-2 text-xs px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">Hari Ini</button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-gray-50">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-600">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
          const dayEvents = eventsByDay.get(key) || [];
          const today_ = isToday(cell.date);
          return (
            <div key={idx} className={`min-h-[100px] border-r border-b p-1.5 ${!cell.currentMonth ? 'bg-gray-50/60' : ''} ${today_ ? 'bg-blue-50' : ''}`}>
              <div className={`text-xs font-semibold mb-1 ${!cell.currentMonth ? 'text-gray-400' : today_ ? 'text-blue-600' : 'text-gray-700'}`}>
                {cell.day}
                {today_ && <span className="ml-1 inline-block w-1.5 h-1.5 bg-blue-500 rounded-full" />}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev) => {
                  const cfg = TYPE_CONFIG[ev.type || 'task'] || TYPE_CONFIG.task;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick?.(ev)}
                      className={`w-full text-left truncate text-[10px] px-1.5 py-0.5 rounded border ${cfg.bg} hover:opacity-80 flex items-center gap-1`}
                      title={ev.title}
                    >
                      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && <div className="text-[10px] text-gray-500 pl-1">+{dayEvents.length - 3} lagi</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
