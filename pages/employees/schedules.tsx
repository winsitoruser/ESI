import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaFilter, FaClock,
  FaUser, FaMapMarkerAlt, FaSpinner, FaChevronLeft, FaChevronRight,
  FaCalendarWeek, FaCalendarDay, FaCheck, FaTimes, FaExclamationCircle
} from 'react-icons/fa';
import { Smartphone, ExternalLink, Copy, CheckCheck } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AddScheduleModal from '@/components/employees/AddScheduleModal';
import EditScheduleModal from '@/components/employees/EditScheduleModal';
import DayDetailModal from '@/components/employees/DayDetailModal';
import { isHoliday, isWeekend, getHolidayColor } from '@/lib/indonesiaHolidays';

interface Schedule {
  id: string;
  employeeId: string;
  scheduleDate: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  employee: {
    id: string;
    name: string;
    employeeNumber: string;
    position: string;
  };
  location?: {
    id: string;
    name: string;
  };
}

const EmployeeSchedules: NextPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const MOCK_SCHEDULES: Schedule[] = [
    { id: 'sch1', employeeId: 'e1', scheduleDate: new Date().toISOString().split('T')[0], shiftType: 'morning', startTime: '08:00', endTime: '16:00', status: 'confirmed', employee: { id: 'e1', name: 'Budi Santoso', employeeNumber: 'EMP-001', position: 'Kasir' }, location: { id: 'l1', name: 'Outlet Utama' } },
    { id: 'sch2', employeeId: 'e2', scheduleDate: new Date().toISOString().split('T')[0], shiftType: 'afternoon', startTime: '14:00', endTime: '22:00', status: 'confirmed', employee: { id: 'e2', name: 'Siti Rahayu', employeeNumber: 'EMP-002', position: 'Barista' }, location: { id: 'l1', name: 'Outlet Utama' } },
    { id: 'sch3', employeeId: 'e3', scheduleDate: new Date().toISOString().split('T')[0], shiftType: 'morning', startTime: '08:00', endTime: '16:00', status: 'pending', employee: { id: 'e3', name: 'Ahmad Wijaya', employeeNumber: 'EMP-003', position: 'Chef' }, location: { id: 'l1', name: 'Outlet Utama' } },
  ];
  const MOCK_EMPLOYEES = [{ id: 'e1', name: 'Budi Santoso', employeeNumber: 'EMP-001', position: 'Kasir' }, { id: 'e2', name: 'Siti Rahayu', employeeNumber: 'EMP-002', position: 'Barista' }, { id: 'e3', name: 'Ahmad Wijaya', employeeNumber: 'EMP-003', position: 'Chef' }];
  const [schedules, setSchedules] = useState<Schedule[]>(MOCK_SCHEDULES);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const employeeAppUrl = typeof window !== 'undefined' ? `${window.location.origin}/employee` : '/employee';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(employeeAppUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSchedules();
      fetchEmployees();
      fetchLocations();
    }
  }, [session, currentDate, viewMode]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const response = await fetch(
        `/api/employees/schedules?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        console.error('Failed to fetch schedules:', response.status);
        setSchedules([]);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON');
        setSchedules([]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSchedules(data.data);
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules(MOCK_SCHEDULES);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000');
      
      if (!response.ok) {
        console.error('Failed to fetch employees:', response.status);
        setEmployees([]);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON');
        setEmployees([]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setEmployees(data.data);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      
      if (!response.ok) {
        console.error('Failed to fetch locations:', response.status);
        setLocations([]);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON');
        setLocations([]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setLocations(data.data);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowEditModal(true);
  };

  const handleModalSuccess = () => {
    fetchSchedules();
  };

  const handleDateClick = (day: Date) => {
    const daySchedules = getSchedulesForDate(day);
    setSelectedDate(day);
    setSelectedDateSchedules(daySchedules);
    setShowDayDetailModal(true);
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end.setDate(start.getDate() + 6);
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getWeekDays = () => {
    const days = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getMonthDays = () => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0 = Sunday)
    const startingDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.scheduleDate === dateStr);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      scheduled: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
      absent: 'bg-orange-100 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getShiftColor = (shiftType: string) => {
    const colors: any = {
      pagi: 'bg-yellow-500',
      siang: 'bg-blue-500',
      malam: 'bg-purple-500',
      full: 'bg-green-500'
    };
    return colors[shiftType] || 'bg-gray-500';
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin h-12 w-12 mx-auto text-blue-600" />
            <p className="mt-4 text-gray-700">{t('employees.loadingSchedule')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t('employees.pageTitle')}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('employees.scheduleTitle')}</h1>
            <p className="text-gray-600 mt-1">{t('employees.scheduleSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus />
            <span>{t('employees.addSchedule')}</span>
          </button>
        </div>

        {/* Employee Mobile App Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Aplikasi Mobile Karyawan</p>
              <p className="text-xs text-blue-100 mt-0.5">Bagikan link ini kepada karyawan untuk akses absensi, cuti, dan KPI</p>
              <div className="flex items-center gap-2 mt-1.5 bg-white/10 rounded-lg px-2.5 py-1 w-fit">
                <span className="text-xs text-white font-mono">{employeeAppUrl}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin!' : 'Salin Link'}
            </button>
            <Link
              href="/employee"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-blue-600 hover:bg-blue-50 text-xs font-semibold rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('employees.totalSchedules')}</p>
                  <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('employees.scheduled')}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {schedules.filter(s => s.status === 'scheduled').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaClock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('employees.confirmed')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {schedules.filter(s => s.status === 'confirmed').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FaCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('employees.activeEmployees')}</p>
                  <p className="text-2xl font-bold text-purple-600">{employees.length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FaUser className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">
                  {currentDate.toLocaleDateString('id-ID', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h2>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hari Ini
                </button>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      viewMode === 'week'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FaCalendarWeek className="inline mr-2" />
                    Minggu
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      viewMode === 'month'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FaCalendarDay className="inline mr-2" />
                    Bulan
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Week View */}
            {viewMode === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {getWeekDays().map((day, idx) => {
                  const daySchedules = getSchedulesForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dateStr = day.toISOString().split('T')[0];
                  const holiday = isHoliday(dateStr);
                  const isWeekendDay = isWeekend(day);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDateClick(day)}
                      className={`border rounded-lg p-3 min-h-[200px] cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                        isToday
                          ? 'border-blue-500 bg-blue-50'
                          : holiday
                          ? getHolidayColor(holiday)
                          : isWeekendDay
                          ? 'border-gray-300 bg-gray-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="text-center mb-3">
                        <p className="text-xs text-gray-500">
                          {day.toLocaleDateString('id-ID', { weekday: 'short' })}
                        </p>
                        <p className={`text-lg font-bold ${
                          isToday ? 'text-blue-600' : holiday ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {day.getDate()}
                        </p>
                        {holiday && (
                          <p className="text-xs font-medium text-red-600 mt-1 truncate">
                            {holiday.name}
                          </p>
                        )}
                        {daySchedules.length > 0 && (
                          <p className="text-xs text-blue-600 font-semibold mt-1">
                            {daySchedules.length} jadwal
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        {daySchedules.slice(0, 2).map((schedule) => (
                          <div
                            key={schedule.id}
                            className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleClick(schedule);
                            }}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getShiftColor(schedule.shiftType)}`}></div>
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {schedule.employee.name}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600">
                              {schedule.startTime.substring(0, 5)} - {schedule.endTime.substring(0, 5)}
                            </p>
                            <Badge className={`text-xs mt-1 ${getStatusColor(schedule.status)}`}>
                              {schedule.status}
                            </Badge>
                          </div>
                        ))}
                        {daySchedules.length > 2 && (
                          <div className="text-xs text-center text-blue-600 font-medium py-1 bg-blue-50 rounded">
                            +{daySchedules.length - 2} lagi
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Month View - Calendar Grid */}
            {viewMode === 'month' && (
              <div>
                {/* Calendar Header - Days of Week */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                    <div key={day} className="text-center py-2">
                      <p className="text-sm font-semibold text-gray-600">{day}</p>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid - Full Month */}
                <div className="grid grid-cols-7 gap-2">
                  {getMonthDays().map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="min-h-[120px]"></div>;
                    }

                    const daySchedules = getSchedulesForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const dateStr = day.toISOString().split('T')[0];
                    const holiday = isHoliday(dateStr);
                    const isWeekendDay = isWeekend(day);

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDateClick(day)}
                        className={`border rounded-lg p-2 min-h-[120px] transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] ${
                          isToday
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : holiday
                            ? getHolidayColor(holiday) + ' border-2'
                            : isWeekendDay
                            ? 'border-gray-300 bg-gray-50'
                            : isCurrentMonth
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              {holiday && (
                                <p className="text-xs font-semibold text-red-600 truncate">
                                  {holiday.name}
                                </p>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${
                                isToday
                                  ? 'bg-blue-600 text-white'
                                  : holiday
                                  ? 'bg-red-600 text-white'
                                  : isCurrentMonth
                                  ? 'text-gray-900'
                                  : 'text-gray-400'
                              }`}
                            >
                              {day.getDate()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {daySchedules.slice(0, 2).map((schedule) => (
                            <div
                              key={schedule.id}
                              className="bg-white border border-gray-200 rounded px-2 py-1 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScheduleClick(schedule);
                              }}
                            >
                              <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getShiftColor(schedule.shiftType)}`}></div>
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {schedule.employee.name}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500">
                                {schedule.startTime.substring(0, 5)}
                              </p>
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-xs text-blue-600 font-medium text-center py-1 bg-blue-50 rounded">
                              +{daySchedules.length - 2} lagi
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Shift Types */}
              <div className="flex items-center space-x-6">
                <p className="text-sm font-semibold text-gray-700">Shift:</p>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-600">Pagi</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">Siang</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-gray-600">Malam</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Full Day</span>
                </div>
              </div>

              {/* Calendar Indicators */}
              <div className="flex items-center space-x-6 pt-3 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Kalender:</p>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-red-100 border-2 border-red-300 flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600">H</span>
                  </div>
                  <span className="text-sm text-gray-600">Hari Libur Nasional</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-green-100 border-2 border-green-300 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-600">H</span>
                  </div>
                  <span className="text-sm text-gray-600">Hari Libur Keagamaan</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-gray-50 border border-gray-300"></div>
                  <span className="text-sm text-gray-600">Akhir Pekan</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-blue-50 border-2 border-blue-500"></div>
                  <span className="text-sm text-gray-600">Hari Ini</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <AddScheduleModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleModalSuccess}
          employees={employees}
          locations={locations}
        />

        <EditScheduleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSchedule(null);
          }}
          onSuccess={handleModalSuccess}
          schedule={selectedSchedule}
          employees={employees}
          locations={locations}
        />

        <DayDetailModal
          isOpen={showDayDetailModal}
          onClose={() => {
            setShowDayDetailModal(false);
            setSelectedDate(null);
            setSelectedDateSchedules([]);
          }}
          date={selectedDate || new Date()}
          schedules={selectedDateSchedules}
        />
      </div>
    </DashboardLayout>
  );
};

export default EmployeeSchedules;
