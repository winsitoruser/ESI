import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Target, Calendar, DollarSign, Clock, Bell, Briefcase,
  Award, TrendingUp, TrendingDown, ChevronRight, Plus, CheckCircle,
  XCircle, AlertTriangle, Plane, Receipt, FileText, Shield,
  LogOut, Settings, Home, BarChart3, CalendarDays, Wallet,
  Coffee, Heart, Sun, Moon, Sunrise, Building2, MapPin,
  Eye, Send, RefreshCw, Menu, X, Loader2, Fingerprint,
  Navigation, Camera, Image, ClipboardCheck, Package, Store,
  CheckSquare, AlertCircle, Map, ScanLine, Timer, Banknote, LayoutGrid, Megaphone, ExternalLink, Users
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import PhotoCaptureField from '@/components/employee/PhotoCaptureField';
import {
  Card, SectionHeader, StatusBadge, GeofenceBadge,
  PortalLoading, EnterpriseHero, QuickAction, StatTile,
} from '@/components/employee/portal-ui';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

const TabSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-24 rounded-2xl bg-slate-200" />
    <div className="h-32 rounded-2xl bg-slate-200" />
    <div className="h-20 rounded-2xl bg-slate-200" />
  </div>
);

const MultifinanceFieldTab = dynamic(() => import('@/components/employee/MultifinanceFieldTab'), { loading: () => <TabSkeleton />, ssr: false });
const ManagerHubTab = dynamic(() => import('@/components/employee/ManagerHubTab'), { loading: () => <TabSkeleton />, ssr: false });
const MyFilesTab = dynamic(() => import('@/components/employee/MyFilesTab'), { loading: () => <TabSkeleton />, ssr: false });
const PayslipTab = dynamic(() => import('@/components/employee/PayslipTab'), { loading: () => <TabSkeleton />, ssr: false });
const DisciplinaryTab = dynamic(() => import('@/components/employee/DisciplinaryTab'), { loading: () => <TabSkeleton />, ssr: false });
const VisitDetailModal = dynamic(() => import('@/components/employee/VisitDetailModal'), { ssr: false });

type TabKey = 'home' | 'attendance' | 'overtime' | 'kpi' | 'leave' | 'claims' | 'travel' | 'visit' | 'mf' | 'profile' | 'files' | 'manager' | 'payslip' | 'disciplinary';

// ─── Field Visit Types ────────────────────────────────────────────────────────
type VisitStatus = 'planned' | 'checked_in' | 'completed' | 'cancelled' | 'no_contact';
type VisitOutcome = 'order_taken' | 'follow_up' | 'no_contact' | 'rejected' | 'other';
type VisitType = 'regular' | 'prospect' | 'follow_up' | 'delivery' | 'service' | 'inspection';
interface FieldVisit {
  id: string; visit_number: string; customer_name: string; customer_address: string;
  visit_type: VisitType; purpose: string; status: VisitStatus; visit_date: string;
  check_in_time: string | null; check_in_lat: number | null; check_in_lng: number | null; check_in_address: string | null;
  check_out_time: string | null; check_out_lat: number | null; check_out_lng: number | null;
  outcome: VisitOutcome | null; outcome_notes: string | null; duration_minutes: number;
  order_taken: boolean; order_value: number; is_adhoc: boolean;
  next_visit_date: string | null; evidence_photos: any[];
  check_in_photo_url?: string | null; check_out_photo_url?: string | null;
  check_in_geofence_name?: string | null; check_in_geofence_status?: string | null;
  check_in_geofence_distance_m?: number | null;
  check_out_geofence_name?: string | null; check_out_geofence_status?: string | null;
}
type ModalType = 'leave' | 'claim' | 'travel' | null;

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtAttTime = (val?: string | null) => {
  if (!val) return '--:--';
  if (/^\d{2}:\d{2}/.test(val)) return val.substring(0, 5);
  const d = new Date(val);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const CLAIM_TYPES = [
  { value: 'medical', label: 'Medis' },
  { value: 'transport', label: 'Transport' },
  { value: 'meals', label: 'Makan' },
  { value: 'accommodation', label: 'Akomodasi' },
  { value: 'communication', label: 'Komunikasi' },
  { value: 'other', label: 'Lainnya' },
];

const LEAVE_TYPES = [
  { value: 'annual', label: 'Cuti Tahunan' },
  { value: 'sick', label: 'Cuti Sakit' },
  { value: 'important', label: 'Cuti Penting' },
  { value: 'maternity', label: 'Cuti Melahirkan' },
  { value: 'unpaid', label: 'Cuti Tanpa Gaji' },
];

const LEAVE_COLORS = ['bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-500'];

const getInitials = (name: string) =>
  (name || 'K').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

const claimTypeLabel = (v: string) => CLAIM_TYPES.find(c => c.value === v)?.label || v;

const parseEvidencePhotos = (raw: any): Array<{ url: string; caption?: string }> => {
  if (!raw) return [];
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    return arr.map((item: any) => {
      if (typeof item === 'string') return { url: item };
      if (item?.url) return { url: item.url, caption: item.caption };
      return null;
    }).filter(Boolean);
  } catch { return []; }
};

// ─── API Helper ───
const api = async (action: string, method = 'GET', body?: any) => {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`/api/employee/dashboard?action=${action}`, opts);
  return r.json();
};

const mgrApi = async (action: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ action, ...params });
  const r = await fetch(`/api/employee/manager?${qs}`);
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { success: false, error: 'Gagal memproses respons' }; }
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const mainScrollRef = useRef<HTMLElement>(null);
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clocking, setClocking] = useState<'in' | 'out' | null>(null);
  const [clockPhotoModal, setClockPhotoModal] = useState<'in' | 'out' | null>(null);
  const [clockPhoto, setClockPhoto] = useState<string | null>(null);

  // ── Field Visit state ──────────────────────────────────────────────────────
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [visitStats, setVisitStats] = useState({ total: 0, planned: 0, checked_in: 0, completed: 0, target: 5 });
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const visitFetchGen = useRef(0);
  const [activeVisit, setActiveVisit] = useState<FieldVisit | null>(null);
  const [visitModal, setVisitModal] = useState<'check-in' | 'check-out' | 'new-visit' | 'evidence' | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [visitForm, setVisitForm] = useState({ customer_name: '', visit_type: 'regular' as VisitType, purpose: '', outcome: '' as VisitOutcome | '', outcome_notes: '', order_value: '', next_visit_date: '', caption: '' });
  const [visitCheckInPhoto, setVisitCheckInPhoto] = useState<string | null>(null);
  const [visitCheckOutPhoto, setVisitCheckOutPhoto] = useState<string | null>(null);
  const [visitEvidencePhoto, setVisitEvidencePhoto] = useState<string | null>(null);
  const [visitMsg, setVisitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [visitViewMode, setVisitViewMode] = useState<'mine' | 'team'>('mine');
  const [teamVisits, setTeamVisits] = useState<any[]>([]);
  const [teamVisitSummary, setTeamVisitSummary] = useState<any>(null);
  const [teamVisitLoading, setTeamVisitLoading] = useState(false);
  const [teamVisitDate, setTeamVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [teamVisitDetail, setTeamVisitDetail] = useState<any>(null);
  const [teamVisitDetailLoading, setTeamVisitDetailLoading] = useState(false);

  // ─── Data State ───
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [travel, setTravel] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // ─── Form State ───
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
  const [claimForm, setClaimForm] = useState({ claimType: 'medical', amount: '', description: '', receiptDate: '' });
  const [claimFiles, setClaimFiles] = useState<File[]>([]);
  const [claimPreviews, setClaimPreviews] = useState<{ url: string; name: string; type: string }[]>([]);
  const [resubmitClaimId, setResubmitClaimId] = useState<string | null>(null);
  const [resubmitReason, setResubmitReason] = useState<string>('');

  // ── Attendance History state ────────────────────────────────────────────────
  const [attHistory, setAttHistory] = useState<any[]>([]);
  const [attSummary, setAttSummary] = useState<any>({ present: 0, late: 0, absent: 0, leave: 0, wfh: 0, total: 0 });
  const [attMeta, setAttMeta] = useState<any>({ totalWorkHours: 0, workDaysInMonth: 0, attendanceRate: 0 });
  const [attMonth, setAttMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [attLoading, setAttLoading] = useState(false);

  // ── Overtime state ─────────────────────────────────────────────────────────
  const [otRecords, setOtRecords] = useState<any[]>([]);
  const [otRecap, setOtRecap] = useState<any>({ total_sessions: 0, total_hours: 0, total_pay_approved: 0, pending: 0, approved: 0, rejected: 0 });
  const [otMonth, setOtMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [otLoading, setOtLoading] = useState(false);
  const [otModal, setOtModal] = useState<'new' | 'detail' | null>(null);
  const [otDetail, setOtDetail] = useState<any | null>(null);
  const [otMsg, setOtMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [otForm, setOtForm] = useState({ date: '', start_time: '17:00', end_time: '19:00', reason: '', work_description: '', overtime_type: 'regular' });
  const [travelForm, setTravelForm] = useState({ destination: '', departureCity: 'Jakarta', purpose: '', departureDate: '', returnDate: '', transportation: 'flight', estimatedBudget: '' });

  // ── Multifinance field team ─────────────────────────────────────────────────
  const [isMfAgent, setIsMfAgent] = useState(false);
  const [mfOverview, setMfOverview] = useState<any>(null);

  // ── Manager portal (super_admin / manager only) ─────────────────────────────
  const [isManagerPortal, setIsManagerPortal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [managerPendingCount, setManagerPendingCount] = useState(0);

  // ─── Data Fetching ───
  const fetchAll = useCallback(async () => {
    try {
      const [pRes, aRes] = await Promise.all([api('profile'), api('attendance')]);
      setProfile(pRes.data || null);
      setIsMfAgent(!!pRes.data?.isMfAgent);
      setIsManagerPortal(!!pRes.data?.isManagerPortal);
      setIsSuperAdmin(!!pRes.data?.isSuperAdmin);
      setAttendance(aRes.data || null);
      setDataReady(true);
      setLoading(false);

      if (pRes.data?.isManagerPortal) {
        fetch('/api/employee/manager?action=summary')
          .then(r => r.json())
          .then(j => { if (j.success) setManagerPendingCount(j.data?.total || 0); })
          .catch(() => {});
      }

      Promise.all([
        api('kpi'), api('leave-balance'), api('leave-requests'),
        api('claims'), api('travel'), api('notifications'), api('announcements'),
      ]).then(([kRes, lbRes, lrRes, cRes, trRes, nRes, annRes]) => {
        setKpi(kRes.data || null);
        setLeaveBalance(Array.isArray(lbRes.data) ? lbRes.data : []);
        setLeaveRequests(Array.isArray(lrRes.data) ? lrRes.data : []);
        setClaims(Array.isArray(cRes.data) ? cRes.data : []);
        setTravel(Array.isArray(trRes.data) ? trRes.data : []);
        setNotifications(Array.isArray(nRes.data) ? nRes.data : []);
        setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
      }).catch(() => {});

      try {
        const mfRes = await fetch('/api/employee/multifinance?action=profile').then(r => r.json());
        if (mfRes.success && mfRes.data?.isMfAgent) {
          setIsMfAgent(true);
          const ovRes = await fetch('/api/employee/multifinance?action=overview').then(r => r.json());
          if (ovRes.success) setMfOverview(ovRes.data || {});
        } else if (pRes.data?.isMfAgent) {
          setIsMfAgent(true);
          const ovRes = await fetch('/api/employee/multifinance?action=overview').then(r => r.json());
          if (ovRes.success) setMfOverview(ovRes.data || {});
        } else {
          setIsMfAgent(false);
          setMfOverview(null);
        }
      } catch { setIsMfAgent(false); }
    } catch (e) {
      console.error('Fetch error:', e);
      setLoading(false);
    }
  }, []);

  const handleNotificationClick = (n: any) => {
    setShowNotif(false);
    const src = n.source_type || '';
    if (src === 'disciplinary_letter' || n.type === 'disciplinary') {
      goToTab('disciplinary');
      return;
    }
    if (src === 'leave_request') {
      goToTab('leave');
      return;
    }
    if (src === 'employee_claim') {
      goToTab('claims');
      return;
    }
    if (src === 'employee_overtime') {
      goToTab('overtime');
      return;
    }
    if (n.type === 'approval' && isManagerPortal) {
      goToTab('manager');
    }
  };

  const openNotifications = async () => {
    setShowNotif(true);
    try {
      await api('mark-all-notifications-read', 'POST');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    document.body.classList.add('employee-portal-active');
    return () => document.body.classList.remove('employee-portal-active');
  }, [mounted]);
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/employee/login?callbackUrl=${encodeURIComponent('/employee')}`);
    }
  }, [status, router]);
  useEffect(() => { if (mounted) fetchAll(); }, [mounted, fetchAll]);

  // ── Field Visit: Fetch ─────────────────────────────────────────────────────
  const fetchVisits = useCallback(async () => {
    const gen = ++visitFetchGen.current;
    setVisitLoading(true);
    try {
      const res = await fetch(`/api/employee/field-visit?action=visits`);
      const data = await res.json();
      if (gen !== visitFetchGen.current) return;
      if (data.success) {
        setVisits(data.data.visits || []);
        setVisitStats(data.data.stats || { total: 0, planned: 0, checked_in: 0, completed: 0, target: 5 });
      }
    } catch { /* keep existing list */ }
    finally {
      if (gen === visitFetchGen.current) setVisitLoading(false);
    }
  }, []);
  useEffect(() => { if (mounted && activeTab === 'visit') fetchVisits(); }, [mounted, activeTab, fetchVisits]);

  const fetchTeamVisits = useCallback(async () => {
    if (!isManagerPortal) return;
    setTeamVisitLoading(true);
    try {
      const res = await mgrApi('team-visit-feed', { date: teamVisitDate });
      if (res.success) {
        setTeamVisits(res.data?.visits || []);
        setTeamVisitSummary(res.data?.summary || null);
      }
    } catch { /* keep existing */ }
    finally { setTeamVisitLoading(false); }
  }, [isManagerPortal, teamVisitDate]);

  useEffect(() => {
    if (mounted && activeTab === 'visit' && visitViewMode === 'team' && isManagerPortal) {
      fetchTeamVisits();
    }
  }, [mounted, activeTab, visitViewMode, isManagerPortal, fetchTeamVisits]);

  const openTeamVisitDetail = async (visitId: string) => {
    setTeamVisitDetailLoading(true);
    setTeamVisitDetail(null);
    try {
      const res = await mgrApi('team-visit-detail', { visitId });
      if (res.success) setTeamVisitDetail(res.data);
      else toast.error(res.error || 'Gagal memuat detail kunjungan tim');
    } finally { setTeamVisitDetailLoading(false); }
  };

  // ── Attendance History: Fetch ───────────────────────────────────────────────
  const fetchAttendanceHistory = useCallback(async (month: string) => {
    setAttLoading(true);
    try {
      const res = await fetch(`/api/employee/dashboard?action=attendance-history&month=${month}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAttHistory(data.data.records || []);
        setAttSummary(data.data.summary || {});
        setAttMeta({ totalWorkHours: data.data.totalWorkHours, workDaysInMonth: data.data.workDaysInMonth, attendanceRate: data.data.attendanceRate });
      }
    } catch { /* use existing data */ }
    finally { setAttLoading(false); }
  }, []);
  useEffect(() => { if (mounted && activeTab === 'attendance') fetchAttendanceHistory(attMonth); }, [mounted, activeTab, attMonth, fetchAttendanceHistory]);

  // ── Overtime: Fetch history ────────────────────────────────────────────────
  const fetchOvertime = useCallback(async (month: string) => {
    setOtLoading(true);
    try {
      const res = await fetch(`/api/employee/dashboard?action=overtime-history&month=${month}`);
      const data = await res.json();
      if (data.success && data.data) {
        setOtRecords(data.data.records || []);
        setOtRecap(data.data.recap || {});
      }
    } catch {}
    finally { setOtLoading(false); }
  }, []);
  useEffect(() => { if (mounted && activeTab === 'overtime') fetchOvertime(otMonth); }, [mounted, activeTab, otMonth, fetchOvertime]);

  // ── Overtime: Submit ───────────────────────────────────────────────────────
  const handleSubmitOvertime = async () => {
    if (!otForm.date || !otForm.start_time || !otForm.end_time || !otForm.reason) {
      setOtMsg({ type: 'error', text: 'Tanggal, jam, dan alasan wajib diisi' }); return;
    }
    setSubmitting(true); setOtMsg(null);
    try {
      const res = await api('submit-overtime', 'POST', otForm);
      if (res.success) {
        setOtMsg({ type: 'success', text: res.message || 'Pengajuan lembur berhasil dikirim' });
        setTimeout(() => { setOtModal(null); setOtMsg(null); setOtForm({ date: '', start_time: '17:00', end_time: '19:00', reason: '', work_description: '', overtime_type: 'regular' }); fetchOvertime(otMonth); }, 1800);
      } else setOtMsg({ type: 'error', text: res.error || 'Gagal mengajukan lembur' });
    } catch { setOtMsg({ type: 'error', text: 'Gagal mengajukan lembur' }); }
    setSubmitting(false);
  };

  // ── Overtime: Cancel ───────────────────────────────────────────────────────
  const handleCancelOvertime = async (id: string) => {
    try {
      const res = await api('cancel-overtime', 'POST', { id });
      if (res.success) { toast.success(res.message); fetchOvertime(otMonth); }
      else toast.error(res.error || 'Gagal membatalkan');
    } catch { toast.error('Gagal membatalkan'); }
  };

  // ── Field Visit: GPS ────────────────────────────────────────────────────────
  const getGps = () => new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS tidak tersedia'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => reject(new Error('Gagal mendapatkan lokasi: ' + e.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  // ── Field Visit: Check-in ───────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!activeVisit) return;
    if (!visitCheckInPhoto) { setVisitMsg({ type: 'error', text: 'Foto bukti kunjungan wajib diambil' }); return; }
    setGpsLoading(true); setVisitMsg(null);
    try {
      const coords = await getGps();
      setGpsCoords(coords);
      const res = await fetch('/api/employee/field-visit?action=check-in', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: activeVisit.id, latitude: coords.lat, longitude: coords.lng, accuracy: coords.accuracy, photo_base64: visitCheckInPhoto }),
      });
      const data = await res.json();
      if (data.success) {
        setVisitMsg({ type: 'success', text: data.message || 'Check-in berhasil! Lokasi, foto & geofence tercatat.' });
        await fetchVisits();
        setTimeout(() => { setVisitModal(null); setActiveVisit(null); setVisitCheckInPhoto(null); setVisitMsg(null); }, 1200);
      } else setVisitMsg({ type: 'error', text: data.error || 'Gagal check-in' });
    } catch (e: any) { setVisitMsg({ type: 'error', text: e.message }); }
    finally { setGpsLoading(false); }
  };

  // ── Field Visit: Check-out ──────────────────────────────────────────────────
  const handleCheckOut = async () => {
    if (!activeVisit || !visitForm.outcome) { setVisitMsg({ type: 'error', text: 'Pilih hasil kunjungan dahulu' }); return; }
    setGpsLoading(true); setVisitMsg(null);
    try {
      const coords = await getGps().catch(() => null);
      const res = await fetch('/api/employee/field-visit?action=check-out', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: activeVisit.id, latitude: coords?.lat, longitude: coords?.lng, outcome: visitForm.outcome, outcome_notes: visitForm.outcome_notes, order_taken: visitForm.outcome === 'order_taken', order_value: Number(visitForm.order_value) || 0, next_visit_date: visitForm.next_visit_date, photo_base64: visitCheckOutPhoto || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setVisitMsg({ type: 'success', text: data.message || 'Check-out berhasil! Hasil kunjungan tersimpan.' });
        await fetchVisits();
        setTimeout(() => { setVisitModal(null); setActiveVisit(null); setVisitCheckOutPhoto(null); setVisitMsg(null); setVisitForm(f => ({ ...f, outcome: '', outcome_notes: '', order_value: '', next_visit_date: '' })); }, 1200);
      } else setVisitMsg({ type: 'error', text: data.error || 'Gagal check-out' });
    } catch (e: any) { setVisitMsg({ type: 'error', text: e.message }); }
    finally { setGpsLoading(false); }
  };

  // ── Field Visit: Create new (walk-in / planned) ─────────────────────────────
  const handleCreateVisit = async () => {
    if (!visitForm.customer_name?.trim()) { setVisitMsg({ type: 'error', text: 'Nama pelanggan wajib diisi' }); return; }
    if (visitSubmitting) return;
    setVisitSubmitting(true);
    setVisitMsg(null);
    try {
      const res = await fetch('/api/employee/field-visit?action=create-visit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: visitForm.customer_name.trim(),
          visit_type: visitForm.visit_type,
          purpose: visitForm.purpose,
          is_adhoc: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Kunjungan berhasil dibuat');
        setVisitModal(null);
        setVisitForm(f => ({ ...f, customer_name: '', purpose: '' }));
        setVisitMsg(null);
        await fetchVisits();
      } else {
        setVisitMsg({ type: 'error', text: data.error || data.details || 'Gagal membuat kunjungan' });
      }
    } catch {
      setVisitMsg({ type: 'error', text: 'Gagal membuat kunjungan' });
    } finally {
      setVisitSubmitting(false);
    }
  };

  // ─── Actions ───
  const handlePhotoClock = async (type: 'in' | 'out') => {
    if (!clockPhoto) { toast.error('Foto selfie wajib diambil'); return; }
    setClocking(type);
    try {
      const coords = await getGps().catch(() => null);
      const body: Record<string, unknown> = { photo_base64: clockPhoto, method: 'photo_mobile' };
      if (coords) { body.latitude = coords.lat; body.longitude = coords.lng; body.accuracy = coords.accuracy; }
      const res = await api(type === 'in' ? 'clock-in' : 'clock-out', 'POST', body);
      if (res.success) {
        const gf = res.data?.geofence;
        const gfLabel = gf?.inside ? ` · ${gf.name}` : (gf?.name ? ` · luar geofence ${gf.distanceM}m` : '');
        toast.success(`${type === 'in' ? 'Clock In' : 'Clock Out'} foto berhasil${gfLabel}`);
        const aRes = await api('attendance');
        if (aRes.data) setAttendance(aRes.data);
        setClockPhotoModal(null);
        setClockPhoto(null);
      } else toast.error(res.error || `Gagal clock ${type}`);
    } catch { toast.error(`Gagal clock ${type}`); }
    setClocking(null);
  };

  const handleClockIn = async () => {
    setClocking('in');
    try {
      const coords = await getGps().catch(() => null);
      const body = coords
        ? { latitude: coords.lat, longitude: coords.lng, accuracy: coords.accuracy }
        : {};
      const res = await api('clock-in', 'POST', body);
      if (res.success) {
        toast.success(`Clock In berhasil · ${res.data?.checkIn || ''}`);
        const aRes = await api('attendance');
        if (aRes.data) setAttendance(aRes.data);
      } else toast.error(res.error || 'Gagal clock in');
    } catch { toast.error('Gagal clock in'); }
    setClocking(null);
  };

  const handleClockOut = async () => {
    setClocking('out');
    try {
      const coords = await getGps().catch(() => null);
      const body = coords
        ? { latitude: coords.lat, longitude: coords.lng, accuracy: coords.accuracy }
        : {};
      const res = await api('clock-out', 'POST', body);
      if (res.success) {
        toast.success(`Clock Out berhasil · ${res.data?.checkOut || ''}`);
        const aRes = await api('attendance');
        if (aRes.data) setAttendance(aRes.data);
      } else toast.error(res.error || 'Gagal clock out');
    } catch { toast.error('Gagal clock out'); }
    setClocking(null);
  };

  const handleSubmitLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast.error('Semua field harus diisi'); return;
    }
    setSubmitting(true);
    try {
      const res = await api('leave-request', 'POST', leaveForm);
      if (res.success) {
        toast.success(res.message || 'Pengajuan cuti berhasil');
        setModal(null);
        setLeaveForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
        const lrRes = await api('leave-requests');
        setLeaveRequests(Array.isArray(lrRes.data) ? lrRes.data : []);
      } else { toast.error(res.error || 'Gagal mengajukan cuti'); }
    } catch { toast.error('Gagal mengajukan cuti'); }
    setSubmitting(false);
  };

  // ── Claim: handle file selection ────────────────────────────────────────────
  const handleClaimFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const combined = [...claimFiles, ...selected].slice(0, 10); // max 10 files
    setClaimFiles(combined);
    combined.forEach(file => {
      const isImg = file.type.startsWith('image/');
      if (isImg) {
        const reader = new FileReader();
        reader.onload = () => setClaimPreviews(prev => {
          const exists = prev.find(p => p.name === file.name);
          if (exists) return prev;
          return [...prev, { url: reader.result as string, name: file.name, type: file.type }];
        });
        reader.readAsDataURL(file);
      } else {
        setClaimPreviews(prev => prev.find(p => p.name === file.name) ? prev : [...prev, { url: '', name: file.name, type: file.type }]);
      }
    });
    e.target.value = '';
  };

  const removeClaimFile = (name: string) => {
    setClaimFiles(prev => prev.filter(f => f.name !== name));
    setClaimPreviews(prev => prev.filter(p => p.name !== name));
  };

  // ── Claim: open resubmit modal pre-filled with rejected claim data ──────────
  const openResubmit = (c: any) => {
    setResubmitClaimId(c.id);
    setResubmitReason(c.rejection_reason || '');
    setClaimForm({ claimType: c.claim_type, amount: String(c.amount || ''), description: c.description || '', receiptDate: c.receipt_date || '' });
    setClaimFiles([]);
    setClaimPreviews([]);
    setModal('claim');
  };

  const handleSubmitClaim = async () => {
    if (!claimForm.amount || !claimForm.description) {
      toast.error('Semua field harus diisi'); return;
    }
    setSubmitting(true);
    try {
      const attachments = await Promise.all(claimFiles.map(file => new Promise<{ name: string; type: string; data: string }>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result as string });
        reader.readAsDataURL(file);
      })));

      let res;
      if (resubmitClaimId) {
        // ── Resubmit mode: update rejected claim ──
        res = await api('resubmit-claim', 'POST', { claimId: resubmitClaimId, ...claimForm, attachments });
      } else {
        // ── New claim ──
        res = await api('claim', 'POST', { ...claimForm, attachments });
      }

      if (res.success) {
        toast.success(res.message || (resubmitClaimId ? 'Klaim berhasil diajukan ulang' : 'Klaim berhasil dikirim'));
        setModal(null);
        setClaimForm({ claimType: 'medical', amount: '', description: '', receiptDate: '' });
        setClaimFiles([]);
        setClaimPreviews([]);
        setResubmitClaimId(null);
        setResubmitReason('');
        const cRes = await api('claims');
        setClaims(Array.isArray(cRes.data) ? cRes.data : []);
      } else { toast.error(res.error || 'Gagal mengirim klaim'); }
    } catch { toast.error('Gagal mengirim klaim'); }
    setSubmitting(false);
  };

  const handleSubmitTravel = async () => {
    if (!travelForm.destination || !travelForm.purpose || !travelForm.departureDate || !travelForm.returnDate) {
      toast.error('Semua field harus diisi'); return;
    }
    setSubmitting(true);
    try {
      const res = await api('travel-request', 'POST', travelForm);
      if (res.success) {
        toast.success(res.message || 'Pengajuan perjalanan berhasil');
        setModal(null);
        setTravelForm({ destination: '', departureCity: 'Jakarta', purpose: '', departureDate: '', returnDate: '', transportation: 'flight', estimatedBudget: '' });
        const trRes = await api('travel');
        setTravel(Array.isArray(trRes.data) ? trRes.data : []);
      } else { toast.error(res.error || 'Gagal mengajukan perjalanan'); }
    } catch { toast.error('Gagal mengajukan perjalanan'); }
    setSubmitting(false);
  };

  // ─── Derived ───
  const userName = profile?.name || session?.user?.name || 'Karyawan';
  const userPosition = profile?.position || (session?.user as any)?.role || '-';
  const userDept = profile?.department || '-';
  const userBranch = profile?.branch_name || (session?.user as any)?.branchName || '-';
  const userEmail = profile?.email || session?.user?.email || '-';
  const userCode = profile?.employee_code || '-';
  const userJoinDate = profile?.join_date || '2023-01-01';
  const todayAttendance = attendance?.today;
  const lastCheckIn = attendance?.lastCheckIn;
  const lastCheckOut = attendance?.lastCheckOut;
  const lastClockEvent = attendance?.lastClockEvent;
  const monthAttendance = attendance?.thisMonth || { present: 0, late: 0, absent: 0, leave: 0 };
  const canClockIn = !todayAttendance?.check_in;
  const canClockOut = !!todayAttendance?.check_in && !todayAttendance?.check_out;
  const kpiScore = kpi?.overallScore || 0;
  const kpiMetrics = kpi?.metrics || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'pending');
  const pendingClaims = claims.filter((c: any) => c.status === 'pending');
  const pendingTravel = travel.filter((tr: any) => tr.status === 'pending');

  if (!mounted || status === 'loading') return <PortalLoading />;

  if (status === 'unauthenticated') return null;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Selamat Pagi', icon: <Sunrise className="w-5 h-5 text-orange-400" /> };
    if (h < 17) return { text: 'Selamat Siang', icon: <Sun className="w-5 h-5 text-yellow-400" /> };
    return { text: 'Selamat Malam', icon: <Moon className="w-5 h-5 text-indigo-400" /> };
  };
  const greeting = getGreeting();

  const goToTab = (key: TabKey) => {
    setActiveTab(key);
    setShowMoreMenu(false);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };

  // ─── MODAL ───
  const renderModal = () => {
    if (!modal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={() => setModal(null)} />
        <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl">
            <h3 className="font-bold text-gray-900">
              {modal === 'leave' && 'Ajukan Cuti'}
              {modal === 'claim' && (resubmitClaimId ? '🔁 Ajukan Ulang Klaim' : 'Klaim Baru')}
              {modal === 'travel' && 'Ajukan Perjalanan Dinas'}
            </h3>
            <button onClick={() => { setModal(null); setClaimFiles([]); setClaimPreviews([]); setResubmitClaimId(null); setResubmitReason(''); }} className="p-1.5 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="p-4 space-y-4">
            {modal === 'leave' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Jenis Cuti</label>
                  <select value={leaveForm.leaveType} onChange={e => setLeaveForm(f => ({ ...f, leaveType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {LEAVE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tanggal Mulai</label>
                    <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tanggal Selesai</label>
                    <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                {leaveForm.startDate && leaveForm.endDate && (
                  <div className="bg-blue-50 rounded-lg p-2.5 text-sm text-blue-700">
                    Durasi: <b>{Math.max(1, Math.ceil((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / 86400000) + 1)} hari</b>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Alasan</label>
                  <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                    rows={3} placeholder="Jelaskan alasan pengajuan cuti..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <button onClick={handleSubmitLeave} disabled={submitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Mengirim...' : 'Ajukan Cuti'}
                </button>
              </>
            )}
            {modal === 'claim' && (
              <>
                {/* Rejection reason banner — only shown in resubmit mode */}
                {resubmitClaimId && resubmitReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                    <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mb-1">
                      <XCircle className="w-3.5 h-3.5" /> Alasan Penolakan Sebelumnya
                    </p>
                    <p className="text-xs text-red-700 leading-relaxed">{resubmitReason}</p>
                    <p className="text-[10px] text-red-400 mt-2">Perbaiki data di bawah ini sesuai alasan penolakan, lalu kirim ulang.</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Jenis Klaim</label>
                  <select value={claimForm.claimType} onChange={e => setClaimForm(f => ({ ...f, claimType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500">
                    {CLAIM_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Jumlah (Rp)</label>
                  <input type="number" value={claimForm.amount} onChange={e => setClaimForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tanggal Kwitansi</label>
                  <input type="date" value={claimForm.receiptDate} onChange={e => setClaimForm(f => ({ ...f, receiptDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Deskripsi</label>
                  <textarea value={claimForm.description} onChange={e => setClaimForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="Jelaskan detail klaim..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 resize-none" />
                </div>

                {/* ── Multiple File Upload ── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">Lampiran Bukti</label>
                    {claimFiles.length > 0 && <span className="text-xs text-gray-400">{claimFiles.length}/10 file</span>}
                  </div>

                  {/* Drop zone / picker */}
                  <label className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-4 cursor-pointer transition-colors ${claimFiles.length >= 10 ? 'border-gray-200 bg-gray-50 opacity-50 pointer-events-none' : 'border-green-300 bg-green-50 hover:bg-green-100 active:scale-[0.98]'}`}>
                    <Camera className="w-7 h-7 text-green-500" />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-green-700">Foto / Dokumen</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Kwitansi, foto, PDF — maks. 10 file</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={handleClaimFiles}
                      disabled={claimFiles.length >= 10}
                    />
                  </label>

                  {/* Preview grid */}
                  {claimPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {claimPreviews.map(p => (
                        <div key={p.name} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center">
                          {p.url ? (
                            <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-2 w-full h-full">
                              <FileText className="w-7 h-7 text-gray-400 mb-1" />
                              <span className="text-[9px] text-gray-500 text-center leading-tight break-all line-clamp-2">{p.name}</span>
                            </div>
                          )}
                          {/* Remove button */}
                          <button
                            onClick={() => removeClaimFile(p.name)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {/* File type badge for non-images */}
                          {!p.url && (
                            <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-gray-200 text-gray-600 px-1 rounded uppercase">
                              {p.name.split('.').pop()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={handleSubmitClaim} disabled={submitting}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting
                    ? (resubmitClaimId ? 'Mengajukan Ulang...' : 'Mengirim...')
                    : resubmitClaimId
                      ? `Ajukan Ulang${claimFiles.length > 0 ? ` (${claimFiles.length} lampiran)` : ''}`
                      : `Kirim Klaim${claimFiles.length > 0 ? ` (${claimFiles.length} lampiran)` : ''}`
                  }
                </button>
              </>
            )}
            {modal === 'travel' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Kota Asal</label>
                    <input type="text" value={travelForm.departureCity} onChange={e => setTravelForm(f => ({ ...f, departureCity: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tujuan</label>
                    <input type="text" value={travelForm.destination} onChange={e => setTravelForm(f => ({ ...f, destination: e.target.value }))}
                      placeholder="Surabaya" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tujuan Perjalanan</label>
                  <textarea value={travelForm.purpose} onChange={e => setTravelForm(f => ({ ...f, purpose: e.target.value }))}
                    rows={2} placeholder="Visit cabang, meeting, dll..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Berangkat</label>
                    <input type="date" value={travelForm.departureDate} onChange={e => setTravelForm(f => ({ ...f, departureDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Pulang</label>
                    <input type="date" value={travelForm.returnDate} onChange={e => setTravelForm(f => ({ ...f, returnDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Transportasi</label>
                    <select value={travelForm.transportation} onChange={e => setTravelForm(f => ({ ...f, transportation: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500">
                      <option value="flight">Pesawat</option>
                      <option value="train">Kereta</option>
                      <option value="bus">Bus</option>
                      <option value="car">Mobil</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Estimasi Budget</label>
                    <input type="number" value={travelForm.estimatedBudget} onChange={e => setTravelForm(f => ({ ...f, estimatedBudget: e.target.value }))}
                      placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                <button onClick={handleSubmitTravel} disabled={submitting}
                  className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Mengirim...' : 'Ajukan Perjalanan'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── TAB: HOME ───
  const renderHome = () => (
    <div className="space-y-4">
      <EnterpriseHero
        greeting={greeting}
        userName={userName}
        userPosition={userPosition}
        userBranch={userBranch}
        userDept={userDept}
        initials={getInitials(userName)}
      />

      {/* Presensi — Clock In/Out + Lokasi */}
      <Card className="p-4" variant="elevated">
        <SectionHeader
          title="Presensi Hari Ini"
          subtitle="Clock in/out dengan GPS & geofence"
          action={todayAttendance?.status ? <StatusBadge status={todayAttendance.status} /> : undefined}
        />

        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <button
            onClick={handleClockIn}
            disabled={!canClockIn || clocking === 'in'}
            className={`py-4 rounded-2xl text-sm font-bold flex flex-col items-center justify-center gap-1.5 active:scale-[0.98] transition-all ${
              !canClockIn
                ? 'bg-slate-100 text-slate-400'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25'
            }`}
          >
            {clocking === 'in' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-6 h-6" />}
            <span>Clock In</span>
            <span className="text-[10px] font-normal opacity-80">+ GPS lokasi</span>
          </button>
          <button
            onClick={handleClockOut}
            disabled={!canClockOut || clocking === 'out'}
            className={`py-4 rounded-2xl text-sm font-bold flex flex-col items-center justify-center gap-1.5 active:scale-[0.98] transition-all ${
              !canClockOut
                ? 'bg-slate-100 text-slate-400'
                : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
            }`}
          >
            {clocking === 'out' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-6 h-6" />}
            <span>Clock Out</span>
            <span className="text-[10px] font-normal opacity-80">+ GPS lokasi</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button
            onClick={() => { setClockPhoto(null); setClockPhotoModal('in'); }}
            disabled={!canClockIn || clocking === 'in'}
            className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all border-2 ${
              !canClockIn ? 'border-slate-100 text-slate-300 bg-slate-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Absensi Foto Masuk</span>
            <span className="text-[9px] font-normal opacity-70">Selfie + GPS + geofence</span>
          </button>
          <button
            onClick={() => { setClockPhoto(null); setClockPhotoModal('out'); }}
            disabled={!canClockOut || clocking === 'out'}
            className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all border-2 ${
              !canClockOut ? 'border-slate-100 text-slate-300 bg-slate-50' : 'border-orange-200 text-orange-700 bg-orange-50'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Absensi Foto Pulang</span>
            <span className="text-[9px] font-normal opacity-70">Selfie + GPS + geofence</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Masuk', time: fmtAttTime(todayAttendance?.check_in), gradient: 'from-emerald-500 to-teal-600', icon: Sunrise },
            { label: 'Pulang', time: fmtAttTime(todayAttendance?.check_out), gradient: 'from-orange-500 to-amber-600', icon: Moon },
          ].map((slot, i) => (
            <div key={i} className="relative rounded-2xl bg-slate-50 p-3 overflow-hidden border border-slate-100">
              <div className={`absolute inset-0 bg-gradient-to-br ${slot.gradient} opacity-[0.07]`} />
              <div className="relative text-center">
                <slot.icon className="w-4 h-4 text-slate-500 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-slate-800 tabular-nums">{slot.time}</p>
                <p className="text-[11px] font-medium text-slate-500">{slot.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100/80 mb-4">
          <StatTile label="Hadir" value={monthAttendance.present} accent="emerald" />
          <StatTile label="Telat" value={monthAttendance.late} accent="amber" />
          <StatTile label="Izin" value={monthAttendance.leave} accent="sky" />
          <StatTile label="Absen" value={monthAttendance.absent} accent="rose" />
        </div>

        {(lastClockEvent || lastCheckIn || lastCheckOut) && (
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-semibold text-slate-700">Lokasi Presensi Terakhir</p>
            </div>

            {lastClockEvent && (
              <div className={`rounded-xl p-3 border ${
                lastClockEvent.type === 'check_out'
                  ? 'bg-orange-50/80 border-orange-100'
                  : 'bg-emerald-50/80 border-emerald-100'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    lastClockEvent.type === 'check_out' ? 'bg-orange-200 text-orange-800' : 'bg-emerald-200 text-emerald-800'
                  }`}>
                    {lastClockEvent.label}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {lastClockEvent.time || '--:--'}
                    {lastClockEvent.date ? ` · ${fmtDate(lastClockEvent.date)}` : ''}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 leading-snug">
                  {lastClockEvent.location?.address
                    || (lastClockEvent.location?.lat != null
                      ? `${lastClockEvent.location.lat.toFixed(5)}, ${lastClockEvent.location.lng?.toFixed(5)}`
                      : 'Lokasi tidak tercatat')}
                </p>
                <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                  {lastClockEvent.location?.accuracy != null && (
                    <p className="text-[10px] text-slate-400">Akurasi ±{Math.round(lastClockEvent.location.accuracy)}m</p>
                  )}
                  {lastClockEvent.location?.geofence && (
                    <GeofenceBadge
                      name={lastClockEvent.location.geofence.name}
                      status={lastClockEvent.location.geofence.inside ? 'inside' : 'outside'}
                      distance={lastClockEvent.location.geofence.distanceM}
                    />
                  )}
                  {lastClockEvent.mapsUrl && (
                    <a href={lastClockEvent.mapsUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 ml-auto">
                      Buka Peta <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {lastCheckIn && lastCheckOut && lastCheckIn.time !== lastCheckOut.time && (
              <div className="grid grid-cols-2 gap-2">
                {lastCheckIn && (
                  <div className="rounded-lg p-2.5 bg-emerald-50/70 border border-emerald-100 text-[11px]">
                    <p className="font-semibold text-emerald-700 mb-0.5">{lastCheckIn.label}</p>
                    <p className="text-slate-600 truncate">{lastCheckIn.location?.address || '—'}</p>
                    <p className="text-slate-400 mt-0.5 tabular-nums">{lastCheckIn.time}</p>
                  </div>
                )}
                {lastCheckOut && (
                  <div className="rounded-lg p-2.5 bg-orange-50/70 border border-orange-100 text-[11px]">
                    <p className="font-semibold text-orange-700 mb-0.5">{lastCheckOut.label}</p>
                    <p className="text-slate-600 truncate">{lastCheckOut.location?.address || '—'}</p>
                    <p className="text-slate-400 mt-0.5 tabular-nums">{lastCheckOut.time}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {isManagerPortal && (
        <Card className="p-4 ring-2 ring-violet-100/80">
          <SectionHeader
            title="Panel Manajer"
            action={managerPendingCount > 0 ? (
              <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                {managerPendingCount} pending
              </span>
            ) : undefined}
          />
          <p className="text-xs text-slate-500 mb-3">Persetujuan cuti, klaim, lembur & surat peringatan tim Anda</p>
          <button onClick={() => goToTab('manager')}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98]">
            <Shield className="w-4 h-4" /> Buka Panel Manajer
          </button>
        </Card>
      )}

      {isMfAgent && (
        <Card className="p-4 ring-2 ring-indigo-100/80">
          <SectionHeader
            title="Pembiayaan — Kinerja Hari Ini"
            action={<button onClick={() => goToTab('mf')} className="text-xs font-semibold text-indigo-600">Detail →</button>}
          />
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-medium">Koleksi Hari Ini</p>
              <p className="text-lg font-bold text-emerald-800">{fmtCur(mfOverview?.todayCollection || 0)}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
              <p className="text-[10px] text-blue-600 font-medium">Aktivitas</p>
              <p className="text-lg font-bold text-blue-800">{mfOverview?.todayActivities || 0} kunjungan</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tunggakan: <b className="text-amber-600">{mfOverview?.portfolioOverdue || 0}</b></span>
            <span>NPL: <b className="text-red-600">{mfOverview?.portfolioNpl || 0}</b></span>
            <span>Komisi pending: <b className="text-violet-600">{fmtCur(mfOverview?.pendingCommission || 0)}</b></span>
          </div>
          <button onClick={() => goToTab('mf')}
            className="w-full mt-3 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98]">
            <Building2 className="w-4 h-4" /> Buka Modul Lapangan
          </button>
        </Card>
      )}

      <Card className="p-4">
        <SectionHeader
          title="Info & Pesan Perusahaan"
          action={unreadCount > 0 ? (
            <button onClick={() => openNotifications()} className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              {unreadCount} notif baru
            </button>
          ) : undefined}
        />
        {announcements.length === 0 && notifications.filter((n: any) => !n.read).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Belum ada pengumuman atau notifikasi baru</p>
        ) : (
          <div className="space-y-2.5">
            {announcements.slice(0, 3).map((a: any) => (
              <div
                key={a.id}
                className={`rounded-xl p-3 border ${
                  a.is_pinned
                    ? 'bg-gradient-to-r from-fuchsia-50 to-violet-50 border-fuchsia-100'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    a.priority === 'high' ? 'bg-rose-100' : 'bg-fuchsia-100'
                  }`}>
                    <Megaphone className={`w-4 h-4 ${a.priority === 'high' ? 'text-rose-600' : 'text-fuchsia-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                      {a.is_pinned && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-fuchsia-600 bg-fuchsia-100 px-1.5 py-0.5 rounded flex-shrink-0">Pin</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{a.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{a.time || fmtDate(a.published_at)}</p>
                  </div>
                </div>
              </div>
            ))}
            {notifications.filter((n: any) => !n.read).slice(0, 2).map((n: any) => (
              <button
                key={n.id}
                onClick={() => openNotifications()}
                className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-100/80 text-left active:scale-[0.99] transition-transform"
              >
                <Bell className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <SectionHeader title="Performa KPI" action={<button onClick={() => goToTab('kpi')} className="text-xs font-semibold text-blue-600">Detail →</button>} />
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                stroke={kpiScore >= 80 ? '#10b981' : kpiScore >= 60 ? '#f59e0b' : '#f43f5e'}
                strokeWidth="3" strokeDasharray={`${kpiScore}, 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-slate-800">{kpiScore}</span>
              <span className="text-[9px] text-slate-400">/100</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {kpiMetrics.slice(0, 3).map((m: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 truncate pr-2">{m.name}</span>
                  <span className="font-semibold text-slate-800">{m.actual}{m.unit === '%' ? '%' : ''}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.actual >= m.target ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min((m.actual / (m.target || 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4" variant="elevated">
        <SectionHeader title="Aksi Cepat" subtitle="Pengajuan & akses fitur utama" />
        <div className="grid grid-cols-4 gap-1">
          {(isMfAgent ? [
            { icon: Building2, label: 'Lapangan', gradient: 'from-indigo-500 to-violet-600', action: () => goToTab('mf') },
            { icon: Calendar, label: 'Cuti', gradient: 'from-violet-500 to-indigo-600', action: () => setModal('leave') },
            { icon: Navigation, label: 'Kunjungan', gradient: 'from-cyan-500 to-blue-600', action: () => goToTab('visit') },
            { icon: Target, label: 'KPI', gradient: 'from-fuchsia-500 to-violet-600', action: () => goToTab('kpi') },
          ] : [
            { icon: Calendar, label: 'Cuti', gradient: 'from-violet-500 to-indigo-600', action: () => setModal('leave') },
            { icon: Wallet, label: 'Gaji', gradient: 'from-sky-500 to-blue-600', action: () => goToTab('payslip') },
            { icon: Receipt, label: 'Klaim', gradient: 'from-emerald-500 to-teal-600', action: () => setModal('claim') },
            { icon: Timer, label: 'Lembur', gradient: 'from-orange-500 to-rose-500', action: () => { goToTab('overtime'); setTimeout(() => setOtModal('new'), 100); } },
          ]).map((a, i) => (
            <QuickAction key={i} icon={a.icon} label={a.label} gradient={a.gradient} onClick={a.action} />
          ))}
        </div>
      </Card>

      {leaveBalance.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="Saldo Cuti" action={<button onClick={() => goToTab('leave')} className="text-xs font-semibold text-blue-600">Lihat →</button>} />
          <div className="grid grid-cols-2 gap-2.5">
            {leaveBalance.slice(0, 4).map((lb: any, i: number) => {
              const total = lb.total || lb.total_days || 12;
              const used = lb.used || lb.used_days || 0;
              const remaining = total - used;
              return (
                <div key={i} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[11px] text-slate-500 mb-1 truncate">{lb.type || lb.name}</p>
                  <p className="text-xl font-bold text-slate-800 tabular-nums">{remaining}</p>
                  <p className="text-[10px] text-slate-400">tersisa / {total} hari</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(pendingLeaves.length > 0 || pendingClaims.length > 0 || pendingTravel.length > 0) && (
        <Card className="p-4">
          <SectionHeader title="Menunggu Persetujuan" />
          <div className="space-y-2">
            {pendingLeaves.map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 p-3 bg-amber-50/80 rounded-xl border border-amber-100/80">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-amber-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{l.leave_type_name || l.leave_type}</p>
                  <p className="text-[11px] text-slate-500">{fmtDate(l.start_date || l.startDate)} · {l.total_days || l.totalDays} hari</p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
            {pendingClaims.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-amber-50/80 rounded-xl border border-amber-100/80">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><Receipt className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">Klaim {claimTypeLabel(c.claim_type)}</p>
                  <p className="text-[11px] text-slate-500">{fmtCur(c.amount)}</p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
            {pendingTravel.map((tr: any) => (
              <div key={tr.id} className="flex items-center gap-3 p-3 bg-amber-50/80 rounded-xl border border-amber-100/80">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0"><Plane className="w-4 h-4 text-violet-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">Perjalanan {tr.destination}</p>
                  <p className="text-[11px] text-slate-500">{fmtDate(tr.departure_date)} – {fmtDate(tr.return_date)}</p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {notifications.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="Notifikasi Terbaru" action={<button onClick={() => openNotifications()} className="text-xs font-semibold text-blue-600">Semua</button>} />
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n: any) => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.read ? 'bg-slate-50' : 'bg-blue-50/70 border border-blue-100/60'}`}>
                {n.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> :
                 n.type === 'error' ? <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> :
                 <Bell className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  // ─── TAB: KPI ───
  const renderKPI = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Skor KPI Keseluruhan</h3>
          <span className="text-xs text-gray-500">Periode: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-28 h-28">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                stroke={kpiScore >= 80 ? '#22c55e' : kpiScore >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="2.5" strokeDasharray={`${kpiScore}, 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{kpiScore}</span>
              <span className="text-[10px] text-gray-500">dari 100</span>
            </div>
          </div>
        </div>
        <div className={`text-center text-sm font-medium mb-2 ${kpiScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
          {kpiScore >= 80 ? '🎯 Di Atas Target' : kpiScore >= 60 ? '⚠️ Perlu Peningkatan' : '❌ Di Bawah Target'}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Detail Metrik</h3>
        <div className="space-y-3">
          {kpiMetrics.map((m: any, i: number) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {m.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : m.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-500" /> : <BarChart3 className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm font-medium text-gray-900">{m.name}</span>
                </div>
                <span className="text-sm font-bold">{m.actual}{m.unit} <span className="text-gray-400 font-normal text-xs">/ {m.target}{m.unit}</span></span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${m.actual >= m.target ? 'bg-green-500' : m.actual >= m.target * 0.8 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min((m.actual / m.target) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── TAB: LEAVE ───
  const renderLeave = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Saldo Cuti</h3>
          <button onClick={() => setModal('leave')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Ajukan Cuti
          </button>
        </div>
        <div className="space-y-3">
          {leaveBalance.map((lb: any, i: number) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{lb.type || lb.name}</span>
                <span className="font-medium">{lb.used || lb.used_days || 0}/{lb.total || lb.total_days || 12} hari</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${LEAVE_COLORS[i % LEAVE_COLORS.length]}`}
                  style={{ width: `${((lb.used || lb.used_days || 0) / (lb.total || lb.total_days || 12)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Riwayat Pengajuan</h3>
        {leaveRequests.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Belum ada pengajuan cuti</p> : (
          <div className="space-y-2.5">
            {leaveRequests.map((l: any) => (
              <div key={l.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{l.leave_type_name || LEAVE_TYPES.find(t => t.value === l.leave_type)?.label || l.leave_type}</span>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{l.reason}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{fmtDate(l.start_date || l.startDate)} - {fmtDate(l.end_date || l.endDate)}</span>
                  <span>{l.total_days || l.totalDays} hari</span>
                </div>
                {l.status === 'pending' && l.total_approval_steps > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((l.current_approval_step || 1) / l.total_approval_steps) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-violet-600 font-semibold whitespace-nowrap">
                      Tahap {l.current_approval_step || 1}/{l.total_approval_steps}
                    </span>
                  </div>
                )}
                {l.status === 'pending' && l.current_step?.approver_role && (
                  <p className="text-[10px] text-amber-600 mt-1">Menunggu: {l.current_step.approver_role}</p>
                )}
                {l.status === 'rejected' && l.rejection_reason && (
                  <p className="text-[10px] text-rose-600 mt-1">Alasan: {l.rejection_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── TAB: CLAIMS ───
  const renderClaims = () => {
    const totalApproved = claims.filter((c: any) => c.status === 'approved').reduce((s: number, c: any) => s + parseFloat(c.amount || 0), 0);
    const totalPending = claims.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + parseFloat(c.amount || 0), 0);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-[11px] text-green-600 mb-1">Disetujui</p>
            <p className="text-lg font-bold text-green-700">{fmtCur(totalApproved)}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 text-center">
            <p className="text-[11px] text-yellow-600 mb-1">Menunggu</p>
            <p className="text-lg font-bold text-yellow-700">{fmtCur(totalPending)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Daftar Klaim</h3>
            <button onClick={() => setModal('claim')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Klaim Baru
            </button>
          </div>
          {claims.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Belum ada klaim</p> : (
            <div className="space-y-2.5">
              {claims.map((c: any) => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.claim_type === 'medical' ? 'bg-red-400' : c.claim_type === 'transport' ? 'bg-blue-400' : c.claim_type === 'meals' ? 'bg-orange-400' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium text-gray-900">Klaim {claimTypeLabel(c.claim_type)}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{c.description}</p>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{fmtDate(c.created_at || c.receipt_date)}</span>
                      {c.attachments_count > 0 && (
                        <span className="flex items-center gap-0.5 text-blue-500">
                          <Camera className="w-3 h-3" />{c.attachments_count} lampiran
                        </span>
                      )}
                      {c.resubmit_count > 0 && (
                        <span className="text-orange-500">🔁 ×{c.resubmit_count}</span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-700">{fmtCur(c.amount)}</span>
                  </div>

                  {/* Rejection reason + resubmit button */}
                  {c.status === 'rejected' && (
                    <div className="mt-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-red-600 flex items-center gap-1 mb-1">
                        <XCircle className="w-3 h-3" /> Alasan Penolakan
                      </p>
                      <p className="text-xs text-red-700 leading-relaxed">
                        {c.rejection_reason || c.notes || 'Tidak ada alasan yang diberikan'}
                      </p>
                      {c.rejected_by_name && (
                        <p className="text-[10px] text-red-400 mt-1">
                          oleh {c.rejected_by_name}{c.rejected_at ? ` • ${fmtDate(c.rejected_at)}` : ''}
                        </p>
                      )}
                      <button
                        onClick={() => openResubmit(c)}
                        className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Ajukan Ulang
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── TAB: TRAVEL ───
  const renderTravel = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Perjalanan Dinas</h3>
          <button onClick={() => setModal('travel')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Ajukan Baru
          </button>
        </div>
        {travel.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Belum ada perjalanan dinas</p> : (
          <div className="space-y-3">
            {travel.map((tr: any) => (
              <div key={tr.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Plane className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tr.destination}</p>
                      <p className="text-[11px] text-gray-500">{tr.request_number}</p>
                    </div>
                  </div>
                  <StatusBadge status={tr.status} />
                </div>
                <p className="text-xs text-gray-600 mb-2">{tr.purpose}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{fmtDate(tr.departure_date)} - {fmtDate(tr.return_date)}</span>
                  <span className="font-semibold text-gray-700">{fmtCur(tr.estimated_budget)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── TAB: PROFILE ───
  const renderProfile = () => (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 p-6 text-white text-center shadow-xl">
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative">
          <div className="w-20 h-20 bg-white/15 backdrop-blur border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            {getInitials(userName)}
          </div>
          <h3 className="text-lg font-bold">{userName}</h3>
          <p className="text-sm text-blue-100">{userPosition}</p>
          <p className="text-xs text-blue-200/80 mt-1 font-mono">{userCode}</p>
        </div>
      </div>
      <Card className="p-4">
        <SectionHeader title="Informasi Akun" />
        <div className="space-y-3">
          {[
            { icon: Building2, label: 'Departemen', value: userDept },
            { icon: MapPin, label: 'Cabang', value: userBranch },
            { icon: Briefcase, label: 'Email', value: userEmail },
            { icon: Clock, label: 'Bergabung', value: fmtDate(userJoinDate) },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">{item.label}</p>
                <p className="text-sm font-medium text-slate-900 truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <button
        type="button"
        onClick={() => goToTab('files')}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-blue-100 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-slate-700 block">My Files</span>
            <span className="text-[11px] text-slate-400">KTP, KK, ijazah & dokumen lainnya</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
      <div className="space-y-2">
        <Link href="/humanify/ess" className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3"><div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center"><FileText className="w-4 h-4 text-blue-600" /></div><span className="text-sm font-medium text-slate-700">Portal ESS Lengkap</span></div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
        <Link href="/hq/dashboard" className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3"><div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center"><Shield className="w-4 h-4 text-violet-600" /></div><span className="text-sm font-medium text-slate-700">HQ Dashboard</span></div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/employee/login' })} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-rose-100 active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3"><div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center"><LogOut className="w-4 h-4 text-rose-500" /></div><span className="text-sm font-medium text-rose-600">Keluar</span></div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </button>
      </div>
    </div>
  );

  // ─── TAB: FIELD VISIT ──────────────────────────────────────────────────────
  const visitTypeLabel: Record<VisitType, string> = { regular: 'Reguler', prospect: 'Prospek', follow_up: 'Follow-up', delivery: 'Pengiriman', service: 'Servis', inspection: 'Inspeksi' };
  const visitTypeColor: Record<VisitType, string> = { regular: 'bg-blue-100 text-blue-700', prospect: 'bg-purple-100 text-purple-700', follow_up: 'bg-orange-100 text-orange-700', delivery: 'bg-green-100 text-green-700', service: 'bg-yellow-100 text-yellow-700', inspection: 'bg-gray-100 text-gray-700' };
  const statusLabel: Record<VisitStatus, string> = { planned: 'Direncanakan', checked_in: 'Dalam Kunjungan', completed: 'Selesai', cancelled: 'Dibatalkan', no_contact: 'Tidak Bertemu' };
  const statusColor: Record<VisitStatus, string> = { planned: 'bg-gray-100 text-gray-600', checked_in: 'bg-blue-100 text-blue-700 animate-pulse', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700', no_contact: 'bg-yellow-100 text-yellow-700' };
  const outcomeOptions: { value: VisitOutcome; label: string; icon: string }[] = [
    { value: 'order_taken', label: '✅ Pesanan Diambil', icon: '🛒' },
    { value: 'follow_up', label: '🔁 Perlu Follow-up', icon: '🔁' },
    { value: 'no_contact', label: '📵 Tidak Bertemu', icon: '📵' },
    { value: 'rejected', label: '❌ Ditolak', icon: '❌' },
    { value: 'other', label: '📝 Lainnya', icon: '📝' },
  ];

  const renderVisit = () => (
    <div className="space-y-4">
      {isManagerPortal && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setVisitViewMode('mine')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              visitViewMode === 'mine' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            Kunjungan Saya
          </button>
          <button
            type="button"
            onClick={() => setVisitViewMode('team')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              visitViewMode === 'team' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Kunjungan Tim
          </button>
        </div>
      )}

      {visitViewMode === 'team' && isManagerPortal ? (
        <>
          <p className="text-[11px] text-slate-500 px-1">
            Log kunjungan karyawan di bawah tanggung jawab Anda sebagai atasan
          </p>
          <div className="flex gap-2">
            <input
              type="date"
              value={teamVisitDate}
              onChange={e => setTeamVisitDate(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
            <button type="button" onClick={fetchTeamVisits} className="p-2.5 rounded-xl bg-violet-50 text-violet-700 active:scale-95">
              <RefreshCw className={`w-4 h-4 ${teamVisitLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {teamVisitSummary && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total', value: teamVisitSummary.total, color: 'text-slate-700', bg: 'bg-slate-50' },
                { label: 'Selesai', value: teamVisitSummary.completed, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Aktif', value: teamVisitSummary.checked_in, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Bukti', value: teamVisitSummary.with_photos, color: 'text-amber-700', bg: 'bg-amber-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {teamVisitLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-violet-500" /></div>
          ) : teamVisits.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Belum ada kunjungan tim pada tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teamVisits.map(tv => (
                <button
                  key={tv.id}
                  type="button"
                  onClick={() => openTeamVisitDetail(tv.id)}
                  className="w-full text-left bg-white rounded-xl border border-slate-100 p-3 shadow-sm active:scale-[0.99]"
                >
                  <div className="flex gap-3">
                    {tv.thumbnail_url ? (
                      <img src={tv.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Image className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{tv.customer_name}</p>
                      <p className="text-[11px] text-violet-600 font-medium">{tv.employee_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor[tv.status as VisitStatus] || 'bg-slate-100 text-slate-600'}`}>
                          {statusLabel[tv.status as VisitStatus] || tv.status}
                        </span>
                        {tv.check_in_time && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(tv.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {tv.has_photos && <span className="text-[10px] text-amber-600">{tv.evidence_count} foto</span>}
                        {tv.check_in_geofence_name && (
                          <GeofenceBadge name={tv.check_in_geofence_name} status={tv.check_in_geofence_status} distance={tv.check_in_geofence_distance_m} />
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {(teamVisitDetail || teamVisitDetailLoading) && (
            <VisitDetailModal
              visit={teamVisitDetail}
              loading={teamVisitDetailLoading}
              onClose={() => { setTeamVisitDetail(null); setTeamVisitDetailLoading(false); }}
            />
          )}
        </>
      ) : (
        <>
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: visitStats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Rencana', value: visitStats.planned, color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Aktif', value: visitStats.checked_in, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Selesai', value: visitStats.completed, color: 'text-green-700', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={() => { setVisitModal('new-visit'); setVisitMsg(null); }}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Kunjungan Baru
        </button>
        <button onClick={fetchVisits} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 active:scale-95 transition-all shadow-sm">
          <RefreshCw className={`w-4 h-4 ${visitLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Visit List */}
      {visitLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-blue-400" /></div>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
          <Map className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Belum ada kunjungan hari ini</p>
          <button onClick={() => setVisitModal('new-visit')} className="mt-3 text-blue-600 text-xs font-medium">+ Tambah kunjungan</button>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map(v => {
            const evidence = parseEvidencePhotos(v.evidence_photos);
            const allPhotos = [
              ...(v.check_in_photo_url ? [{ url: v.check_in_photo_url, caption: 'Check-in' }] : []),
              ...(v.check_out_photo_url ? [{ url: v.check_out_photo_url, caption: 'Check-out' }] : []),
              ...evidence,
            ];
            return (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{v.customer_name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{v.customer_address}</span></p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[v.status]}`}>{statusLabel[v.status]}</span>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${visitTypeColor[v.visit_type]}`}>{visitTypeLabel[v.visit_type]}</span>
                  {v.purpose && <p className="text-xs text-gray-500 truncate">{v.purpose}</p>}
                </div>
                {(v.check_in_geofence_name || v.check_in_geofence_status) && (
                  <div className="mb-2">
                    <GeofenceBadge name={v.check_in_geofence_name} status={v.check_in_geofence_status} distance={v.check_in_geofence_distance_m} />
                  </div>
                )}
                {/* Timing info */}
                {v.check_in_time && (
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-blue-500" />Masuk: {new Date(v.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    {v.check_out_time && <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-green-500" />Keluar: {new Date(v.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                    {v.duration_minutes > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(v.duration_minutes)} mnt</span>}
                  </div>
                )}
                {v.outcome && (
                  <div className="flex items-center gap-1.5 text-xs mb-3">
                    <span className="font-medium text-gray-600">Hasil:</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${v.outcome === 'order_taken' ? 'bg-green-100 text-green-700' : v.outcome === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {outcomeOptions.find(o => o.value === v.outcome)?.label || v.outcome}
                    </span>
                  </div>
                )}
                {allPhotos.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Image className="w-3 h-3" />Bukti Kunjungan ({allPhotos.length})</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {allPhotos.slice(0, 6).map((p, i) => (
                        <a key={i} href={p.url} target="_blank" rel="noreferrer" className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                          <img src={p.url} alt={p.caption || 'Bukti'} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {/* Action buttons per status */}
                <div className="flex gap-2">
                  {v.status === 'planned' && (
                    <button onClick={() => { setActiveVisit(v); setVisitCheckInPhoto(null); setVisitModal('check-in'); setGpsCoords(null); setVisitMsg(null); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all">
                      <Navigation className="w-3.5 h-3.5" /> Check-in
                    </button>
                  )}
                  {v.status === 'checked_in' && <>
                    <button onClick={() => { setActiveVisit(v); setVisitEvidencePhoto(null); setVisitModal('evidence'); setVisitMsg(null); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 text-white py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all">
                      <Camera className="w-3.5 h-3.5" /> Foto Bukti
                    </button>
                    <button onClick={() => { setActiveVisit(v); setVisitCheckOutPhoto(null); setVisitModal('check-out'); setVisitForm(f => ({ ...f, outcome: '', outcome_notes: '', order_value: '', next_visit_date: '' })); setVisitMsg(null); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all">
                      <CheckCircle className="w-3.5 h-3.5" /> Check-out
                    </button>
                  </>}
                  {v.status === 'completed' && v.check_in_lat && (
                    <a href={`https://www.google.com/maps?q=${v.check_in_lat},${v.check_in_lng}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 py-2 px-3 rounded-lg text-xs font-medium active:scale-95 transition-all">
                      <MapPin className="w-3.5 h-3.5" /> Lihat Peta
                    </a>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Check-in ─────────────────────────────────────────────────── */}
      {visitModal === 'check-in' && activeVisit && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-pb max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Check-in Kunjungan</h3>
              <button onClick={() => setVisitModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="font-semibold text-sm text-gray-900">{activeVisit.customer_name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{activeVisit.customer_address}</p>
            </div>
            <PhotoCaptureField
              label="Foto Bukti Kunjungan *"
              hint="Wajib ambil foto langsung dari kamera perangkat (bukan galeri)."
              value={visitCheckInPhoto}
              onChange={setVisitCheckInPhoto}
              capture="environment"
              cameraOnly
            />
            {gpsCoords && <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div><p className="text-xs font-semibold text-green-700">Koordinat GPS diperoleh</p>
                <p className="text-[10px] text-green-600">{gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)} (±{Math.round(gpsCoords.accuracy)}m)</p></div>
            </div>}
            {visitMsg && <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${visitMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {visitMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{visitMsg.text}
            </div>}
            <p className="text-xs text-gray-400 flex items-center gap-1"><ScanLine className="w-3 h-3" />GPS + foto + tag geofencing akan dicatat sebagai bukti kunjungan.</p>
            <button onClick={handleCheckIn} disabled={gpsLoading || !visitCheckInPhoto}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">
              {gpsLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Mendapatkan GPS & menyimpan...</> : <><Navigation className="w-4 h-4" />Check-in Sekarang</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Check-out ────────────────────────────────────────────────── */}
      {visitModal === 'check-out' && activeVisit && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 overflow-y-auto">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-pb mt-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Check-out & Hasil Kunjungan</h3>
              <button onClick={() => setVisitModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-semibold text-sm">{activeVisit.customer_name}</p>
              {activeVisit.check_in_time && <p className="text-xs text-gray-400 mt-0.5">Check-in: {new Date(activeVisit.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Hasil Kunjungan <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-1 gap-2">
                {outcomeOptions.map(o => (
                  <button key={o.value} onClick={() => setVisitForm(f => ({ ...f, outcome: o.value }))}
                    className={`text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${visitForm.outcome === o.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {visitForm.outcome === 'order_taken' && (
              <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Nilai Pesanan (Rp)</p>
                <input type="number" value={visitForm.order_value} onChange={e => setVisitForm(f => ({ ...f, order_value: e.target.value }))} placeholder="Contoh: 500000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
              </div>
            )}
            <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Catatan</p>
              <textarea value={visitForm.outcome_notes} onChange={e => setVisitForm(f => ({ ...f, outcome_notes: e.target.value }))} rows={2} placeholder="Catatan hasil kunjungan..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none" />
            </div>
            <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Kunjungan Berikutnya</p>
              <input type="date" value={visitForm.next_visit_date} onChange={e => setVisitForm(f => ({ ...f, next_visit_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
            </div>
            <PhotoCaptureField
              label="Foto Bukti Check-out (opsional)"
              hint="Ambil langsung dari kamera perangkat saat meninggalkan lokasi."
              value={visitCheckOutPhoto}
              onChange={setVisitCheckOutPhoto}
              capture="environment"
              cameraOnly
            />
            {visitMsg && <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${visitMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {visitMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{visitMsg.text}
            </div>}
            <button onClick={handleCheckOut} disabled={gpsLoading || !visitForm.outcome}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">
              {gpsLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><CheckCircle className="w-4 h-4" />Selesaikan Kunjungan</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Evidence Photo ───────────────────────────────────────────── */}
      {visitModal === 'evidence' && activeVisit && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-pb">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Tambah Foto Bukti</h3>
              <button onClick={() => setVisitModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <Image className="w-8 h-8 text-gray-300" />
              <p className="text-xs text-gray-500">Ambil foto sebagai bukti kunjungan (display, stok, tanda terima, dll)</p>
            </div>
            <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Keterangan Foto</p>
              <input type="text" value={visitForm.caption} onChange={e => setVisitForm(f => ({ ...f, caption: e.target.value }))} placeholder="Contoh: Foto display produk di rak"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
            </div>
            <PhotoCaptureField
              label="Foto Bukti"
              hint="Ambil langsung dari kamera — display, stok, tanda terima, dll."
              value={visitEvidencePhoto}
              onChange={setVisitEvidencePhoto}
              capture="environment"
              cameraOnly
            />
            {visitMsg && <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${visitMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {visitMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{visitMsg.text}
            </div>}
            <button
              type="button"
              disabled={submitting || !visitEvidencePhoto}
              onClick={async () => {
                if (!visitEvidencePhoto || !activeVisit) return;
                setSubmitting(true);
                try {
                  const res = await fetch('/api/employee/field-visit?action=add-evidence', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visit_id: activeVisit.id, photo_base64: visitEvidencePhoto, caption: visitForm.caption }),
                  });
                  const data = await res.json();
                  setVisitMsg({ type: data.success ? 'success' : 'error', text: data.message || data.error });
                  if (data.success) {
                    await fetchVisits();
                    setTimeout(() => { setVisitModal(null); setVisitEvidencePhoto(null); setVisitMsg(null); }, 1200);
                  }
                } finally { setSubmitting(false); }
              }}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><Camera className="w-4 h-4" />Simpan Bukti Foto</>}
            </button>
            <p className="text-[10px] text-gray-400 text-center">Foto disimpan sebagai bukti kunjungan lapangan</p>
          </div>
        </div>
      )}

      {/* ── Modal: New Visit ────────────────────────────────────────────────── */}
      {visitModal === 'new-visit' && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => !visitSubmitting && setVisitModal(null)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-pb" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Kunjungan Baru</h3>
              <button onClick={() => setVisitModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Nama Pelanggan / Toko <span className="text-red-500">*</span></p>
              <input type="text" value={visitForm.customer_name} onChange={e => setVisitForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Nama pelanggan atau toko yang dikunjungi"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
            </div>
            <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Jenis Kunjungan</p>
              <select value={visitForm.visit_type} onChange={e => setVisitForm(f => ({ ...f, visit_type: e.target.value as VisitType }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white">
                {Object.entries(visitTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Tujuan Kunjungan</p>
              <textarea value={visitForm.purpose} onChange={e => setVisitForm(f => ({ ...f, purpose: e.target.value }))} rows={2} placeholder="Jelaskan tujuan kunjungan..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none" />
            </div>
            {visitMsg && <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${visitMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {visitMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{visitMsg.text}
            </div>}
            <button type="button" onClick={handleCreateVisit} disabled={visitSubmitting || visitLoading || !visitForm.customer_name?.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">
              {visitSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><Plus className="w-4 h-4" />Buat Kunjungan</>}
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );

  // ─── TAB: ATTENDANCE HISTORY ───────────────────────────────────────────────
  const attStatusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    present: { label: 'Hadir',      bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
    late:    { label: 'Terlambat',  bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    absent:  { label: 'Absen',      bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
    leave:   { label: 'Cuti/Izin',  bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
    wfh:     { label: 'WFH',        bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  };

  const renderAttendance = () => {
    const monthLabel = new Date(`${attMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const prevMonth = () => { const d = new Date(`${attMonth}-01`); d.setMonth(d.getMonth() - 1); setAttMonth(d.toISOString().slice(0, 7)); };
    const nextMonth = () => { const d = new Date(`${attMonth}-01`); d.setMonth(d.getMonth() + 1); if (d <= new Date()) setAttMonth(d.toISOString().slice(0, 7)); };
    const isCurrentMonth = attMonth === new Date().toISOString().slice(0, 7);

    return (
      <div className="space-y-4">
        {/* Month Navigator */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all">
            <ChevronRight className="w-4 h-4 text-gray-600 rotate-180" />
          </button>
          <p className="font-semibold text-gray-800 text-sm capitalize">{monthLabel}</p>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 active:scale-95 transition-all">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Attendance Rate Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-blue-200 uppercase tracking-wide">Tingkat Kehadiran</p>
              <p className="text-4xl font-bold mt-0.5">{attMeta.attendanceRate}<span className="text-xl">%</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">Hari Kerja</p>
              <p className="text-2xl font-bold">{attMeta.workDaysInMonth}<span className="text-sm font-normal"> / {attSummary.total}</span></p>
              <p className="text-xs text-blue-200 mt-0.5">Total jam: {attMeta.totalWorkHours}j</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="bg-white/20 rounded-full h-2.5">
            <div className="bg-white rounded-full h-2.5 transition-all duration-500" style={{ width: `${attMeta.attendanceRate}%` }} />
          </div>
        </div>

        {/* Summary Pills */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { key: 'present', label: 'Hadir',     value: attSummary.present, color: 'bg-green-50 text-green-700' },
            { key: 'late',    label: 'Terlambat', value: attSummary.late,    color: 'bg-yellow-50 text-yellow-700' },
            { key: 'leave',   label: 'Cuti',      value: attSummary.leave,   color: 'bg-blue-50 text-blue-700' },
            { key: 'wfh',     label: 'WFH',       value: attSummary.wfh,     color: 'bg-purple-50 text-purple-700' },
            { key: 'absent',  label: 'Absen',     value: attSummary.absent,  color: 'bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.key} className={`${s.color} rounded-xl p-2 text-center`}>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[9px] font-medium leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Daily Records List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Riwayat Harian</h3>
            <button onClick={() => fetchAttendanceHistory(attMonth)} className="text-gray-400 active:scale-95 transition-all">
              <RefreshCw className={`w-4 h-4 ${attLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {attLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
          ) : attHistory.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada data absensi</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {attHistory.map((r, i) => {
                const d = new Date(r.date + 'T00:00:00');
                const cfg = attStatusConfig[r.status] || attStatusConfig['absent'];
                const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
                const dayNum  = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                const isToday = r.date === new Date().toISOString().split('T')[0];
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${isToday ? 'bg-blue-50/50' : ''}`}>
                    {/* Date column */}
                    <div className={`w-11 text-center flex-shrink-0 ${isToday ? 'bg-blue-600 text-white rounded-xl py-1' : ''}`}>
                      <p className={`text-[10px] font-medium ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>{dayName}</p>
                      <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{d.getDate()}</p>
                    </div>
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        {r.late_minutes > 0 && <span className="text-[10px] text-yellow-600">+{r.late_minutes} mnt</span>}
                        {isToday && <span className="text-[10px] font-bold text-blue-600">Hari ini</span>}
                      </div>
                      {(r.check_in || r.check_out) && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {r.check_in && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-green-500" />{r.check_in?.substring(0,5)}</span>}
                          {r.check_out && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-orange-500" />{r.check_out?.substring(0,5)}</span>}
                          {r.work_hours && <span className="text-gray-400">{r.work_hours}j</span>}
                        </div>
                      )}
                      {r.notes && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{r.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── TAB: OVERTIME (LEMBUR) ────────────────────────────────────────────────
  const OT_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending:   { label: 'Menunggu',  bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
    approved:  { label: 'Disetujui', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
    rejected:  { label: 'Ditolak',   bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
    cancelled: { label: 'Dibatalkan',bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
  };
  const OT_TYPE: Record<string, string> = { regular: 'Reguler', emergency: 'Darurat', project: 'Proyek' };
  const DAY_TYPE: Record<string, { label: string; mult: string; color: string }> = {
    weekday: { label: 'Hari Kerja', mult: '1.5×', color: 'text-blue-600' },
    weekend: { label: 'Akhir Pekan', mult: '2.0×', color: 'text-purple-600' },
    holiday: { label: 'Hari Libur', mult: '3.0×', color: 'text-red-600' },
  };

  const renderOvertime = () => {
    const d = new Date(`${otMonth}-01`);
    const monthLabel = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const prevMonth = () => { const nd = new Date(`${otMonth}-01`); nd.setMonth(nd.getMonth() - 1); setOtMonth(nd.toISOString().slice(0, 7)); };
    const nextMonth = () => { const nd = new Date(`${otMonth}-01`); nd.setMonth(nd.getMonth() + 1); if (nd <= new Date()) setOtMonth(nd.toISOString().slice(0, 7)); };

    return (
      <div className="space-y-4">
        {/* Month Navigator */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95"><ChevronRight className="w-4 h-4 text-gray-600 rotate-180" /></button>
          <p className="font-semibold text-gray-800 text-sm capitalize">{monthLabel}</p>
          <button onClick={nextMonth} disabled={otMonth === new Date().toISOString().slice(0, 7)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 active:scale-95"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
        </div>

        {/* Recap summary cards */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div><p className="text-xs text-orange-100 uppercase tracking-wide">Total Lembur Disetujui</p><p className="text-3xl font-bold mt-0.5">{otRecap.total_hours || 0}<span className="text-lg font-normal"> jam</span></p></div>
            <div className="text-right"><p className="text-xs text-orange-100">Estimasi Upah</p><p className="text-xl font-bold">Rp {(otRecap.total_pay_approved || 0).toLocaleString('id-ID')}</p><p className="text-xs text-orange-200 mt-0.5">{otRecap.total_sessions || 0} sesi</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Menunggu', val: otRecap.pending, col: 'bg-yellow-400/30' }, { label: 'Disetujui', val: otRecap.approved, col: 'bg-white/20' }, { label: 'Ditolak', val: otRecap.rejected, col: 'bg-red-400/30' }].map(s => (
              <div key={s.label} className={`${s.col} rounded-xl py-2 text-center`}><p className="text-lg font-bold">{s.val || 0}</p><p className="text-[10px] text-orange-100">{s.label}</p></div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={() => { setOtModal('new'); setOtMsg(null); setOtForm({ date: '', start_time: '17:00', end_time: '19:00', reason: '', work_description: '', overtime_type: 'regular' }); }}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Ajukan Lembur
          </button>
          <button onClick={() => fetchOvertime(otMonth)} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 active:scale-95 transition-all shadow-sm"><RefreshCw className={`w-4 h-4 ${otLoading ? 'animate-spin' : ''}`} /></button>
        </div>

        {/* Records list */}
        {otLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
        ) : otRecords.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <Timer className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Belum ada catatan lembur bulan ini</p>
            <button onClick={() => setOtModal('new')} className="mt-3 text-orange-500 text-xs font-medium">+ Ajukan lembur</button>
          </div>
        ) : (
          <div className="space-y-3">
            {otRecords.map(ot => {
              const st = OT_STATUS[ot.status] || OT_STATUS['pending'];
              const dt = DAY_TYPE[ot.day_type] || DAY_TYPE['weekday'];
              const dateObj = new Date(ot.date + 'T00:00:00');
              return (
                <div key={ot.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                          <span className={`text-[10px] font-medium ${dt.color}`}>{dt.label} ({dt.mult})</span>
                          <span className="text-[10px] text-gray-400">{OT_TYPE[ot.overtime_type]}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{ot.start_time} – {ot.end_time}</p>
                        <p className="text-xs text-gray-500">{ot.duration_hours} jam</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{ot.reason}</p>
                    {ot.work_description && <p className="text-[10px] text-gray-400 italic mb-2">{ot.work_description}</p>}
                    {ot.calculated_pay > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Banknote className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-medium text-green-700">Rp {(ot.calculated_pay).toLocaleString('id-ID')}</span>
                        <span className="text-gray-400">(estimasi)</span>
                      </div>
                    )}
                    {ot.status === 'rejected' && ot.rejection_reason && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                        <p className="text-[10px] font-bold text-red-600 mb-0.5">Alasan Penolakan</p>
                        <p className="text-xs text-red-700">{ot.rejection_reason}</p>
                      </div>
                    )}
                    {ot.status === 'approved' && ot.approved_by_name && (
                      <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Disetujui oleh {ot.approved_by_name}</p>
                    )}
                    {ot.status === 'pending' && (
                      <button onClick={() => handleCancelOvertime(ot.id)} className="mt-2 text-xs text-red-400 hover:text-red-600 underline">Batalkan pengajuan</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Modal: Ajukan Lembur ─────────────────────────────────────────────── */}
        {otModal === 'new' && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-pb max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Timer className="w-5 h-5 text-orange-500" />Pengajuan Lembur</h3>
                <button onClick={() => setOtModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Tanggal Lembur <span className="text-red-500">*</span></p>
                <input type="date" value={otForm.date} onChange={e => setOtForm(f => ({ ...f, date: e.target.value }))} max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Jam Mulai <span className="text-red-500">*</span></p><input type="time" value={otForm.start_time} onChange={e => setOtForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none" /></div>
                <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Jam Selesai <span className="text-red-500">*</span></p><input type="time" value={otForm.end_time} onChange={e => setOtForm(f => ({ ...f, end_time: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none" /></div>
              </div>
              {/* Duration preview */}
              {otForm.start_time && otForm.end_time && (() => {
                const [sh, sm] = otForm.start_time.split(':').map(Number);
                const [eh, em] = otForm.end_time.split(':').map(Number);
                const dur = Math.max(0, (eh + em / 60) - (sh + sm / 60));
                const dow = otForm.date ? new Date(otForm.date + 'T00:00:00').getDay() : -1;
                const isWeekend = dow === 0 || dow === 6;
                const mult = isWeekend ? 2.0 : 1.5;
                if (dur <= 0) return null;
                return (
                  <div className="bg-orange-50 rounded-xl p-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-orange-500" /><span className="font-semibold text-orange-700">{dur.toFixed(1)} jam</span><span className="text-orange-500 text-xs">({isWeekend ? 'Akhir Pekan' : 'Hari Kerja'} {mult}×)</span></div>
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                  </div>
                );
              })()}
              <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Tipe Lembur</p>
                <select value={otForm.overtime_type} onChange={e => setOtForm(f => ({ ...f, overtime_type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white">
                  <option value="regular">Reguler</option>
                  <option value="emergency">Darurat</option>
                  <option value="project">Proyek</option>
                </select>
              </div>
              <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Alasan Lembur <span className="text-red-500">*</span></p>
                <textarea value={otForm.reason} onChange={e => setOtForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Jelaskan alasan perlu lembur..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none resize-none" />
              </div>
              <div><p className="text-xs font-semibold text-gray-700 mb-1.5">Deskripsi Pekerjaan</p>
                <textarea value={otForm.work_description} onChange={e => setOtForm(f => ({ ...f, work_description: e.target.value }))} rows={2} placeholder="Pekerjaan apa yang akan/sudah dilakukan saat lembur..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none resize-none" />
              </div>
              {otMsg && <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${otMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {otMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{otMsg.text}
              </div>}
              <button onClick={handleSubmitOvertime} disabled={submitting || !otForm.date || !otForm.reason}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</> : <><Send className="w-4 h-4" />Kirim Pengajuan</>}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs: { key: TabKey | 'more'; icon: any; label: string; badge?: number }[] = isMfAgent
    ? [
        { key: 'home',       icon: Home,         label: 'Beranda'  },
        { key: 'attendance', icon: CalendarDays, label: 'Absensi'  },
        { key: 'mf',         icon: Building2,    label: 'Lapangan' },
        { key: 'leave',      icon: Calendar,     label: 'Cuti'     },
        { key: 'more',       icon: LayoutGrid,   label: 'Lainnya'  },
      ]
    : isManagerPortal
    ? [
        { key: 'home',       icon: Home,         label: 'Beranda'  },
        { key: 'attendance', icon: CalendarDays, label: 'Absensi'  },
        { key: 'leave',      icon: Calendar,     label: 'Cuti'     },
        { key: 'manager',    icon: Shield,       label: 'Manajer', badge: managerPendingCount || undefined },
        { key: 'more',       icon: LayoutGrid,   label: 'Lainnya'  },
      ]
    : [
        { key: 'home',       icon: Home,         label: 'Beranda'  },
        { key: 'attendance', icon: CalendarDays, label: 'Absensi'  },
        { key: 'leave',      icon: Calendar,     label: 'Cuti'     },
        { key: 'kpi',        icon: Target,       label: 'KPI'      },
        { key: 'more',       icon: LayoutGrid,   label: 'Lainnya'  },
      ];

  const moreMenuItems: { key: TabKey; icon: any; label: string; desc: string; color: string }[] = [
    { key: 'files',    icon: FileText,   label: 'My Files',    desc: 'Upload KTP, KK, ijazah & dokumen', color: 'bg-blue-100 text-blue-600' },
    { key: 'payslip',  icon: Wallet,     label: 'Slip Gaji',   desc: 'Akses payslip bulanan Anda',       color: 'bg-sky-100 text-sky-600' },
    { key: 'disciplinary', icon: AlertTriangle, label: 'Surat SP', desc: 'Surat peringatan & disiplin', color: 'bg-red-100 text-red-600' },
    ...(isMfAgent ? [{ key: 'mf' as TabKey, icon: Building2, label: 'Pembiayaan Lapangan', desc: 'Koleksi, portofolio & komisi', color: 'bg-indigo-100 text-indigo-600' }] : []),
    { key: 'claims',   icon: Receipt,    label: 'Klaim',       desc: 'Klaim biaya & reimbursement', color: 'bg-green-100 text-green-600' },
    { key: 'overtime', icon: Timer,      label: 'Lembur',      desc: 'Pengajuan & rekap lembur',    color: 'bg-orange-100 text-orange-600' },
    { key: 'travel',   icon: Plane,      label: 'Perjalanan',  desc: 'Perjalanan dinas',            color: 'bg-purple-100 text-purple-600' },
    { key: 'visit',    icon: Navigation, label: 'Kunjungan',   desc: 'Kunjungan lapangan SFA',      color: 'bg-cyan-100 text-cyan-600' },
    ...((isMfAgent || isManagerPortal) ? [{ key: 'kpi' as TabKey, icon: Target, label: 'KPI', desc: 'Indikator kinerja', color: 'bg-violet-100 text-violet-600' }] : []),
    { key: 'profile',  icon: User,       label: 'Profil',      desc: 'Data & pengaturan akun',      color: 'bg-gray-100 text-gray-600' },
  ];

  const secondaryTabs = new Set<TabKey>(['files', 'payslip', 'disciplinary', 'claims', 'overtime', 'travel', 'visit', 'mf', 'profile', 'kpi']);
  const headerTitle = activeTab === 'home'
    ? 'Portal Karyawan'
    : secondaryTabs.has(activeTab)
      ? moreMenuItems.find(m => m.key === activeTab)?.label || 'Portal Karyawan'
      : tabs.find(t => t.key === activeTab)?.label || 'Portal Karyawan';

  const handleNavClick = (key: TabKey | 'more') => {
    if (key === 'more') {
      setShowMoreMenu(true);
      return;
    }
    goToTab(key);
  };

  const renderContent = () => {
    if (loading && !dataReady) return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 rounded-3xl bg-slate-200/80" />
        <div className="h-52 rounded-2xl bg-slate-200/60" />
        <div className="h-28 rounded-2xl bg-slate-200/50" />
      </div>
    );
    const tab = (() => {
    switch (activeTab) {
      case 'home':       return renderHome();
      case 'attendance': return renderAttendance();
      case 'overtime':   return renderOvertime();
      case 'kpi':        return renderKPI();
      case 'leave':      return renderLeave();
      case 'claims':     return renderClaims();
      case 'travel':     return renderTravel();
      case 'visit':      return renderVisit();
      case 'mf':         return <MultifinanceFieldTab onNavigateHome={() => goToTab('home')} />;
      case 'files':      return <MyFilesTab />;
      case 'profile':    return renderProfile();
      case 'manager':    return <ManagerHubTab isSuperAdmin={isSuperAdmin} />;
      case 'payslip':    return <PayslipTab />;
      case 'disciplinary': return <DisciplinaryTab />;
      default: return null;
    }
    })();
    return <div key={activeTab} className="emp-portal-tab">{tab}</div>;
  };

  return (
    <>
      <Head>
        <title>Portal Karyawan — Humanify</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0c0f1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </Head>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: '14px', maxWidth: '90vw' } }} />

      {/* Enterprise shell — mobile-first, refined frame on desktop */}
      <div className="emp-portal-outer min-h-screen bg-[#0c0f1a] md:bg-gradient-to-br md:from-[#0c0f1a] md:via-[#12162a] md:to-[#1a1040] md:py-8">
      <div className="emp-portal-root emp-portal-desktop-frame min-h-screen md:min-h-[calc(100vh-4rem)] bg-[#f8fafc] max-w-md mx-auto relative md:rounded-[2rem] md:shadow-[0_25px_80px_rgba(0,0,0,0.45)] md:ring-1 md:ring-white/10 md:overflow-hidden flex flex-col">
        <header className="sticky top-0 z-40 emp-portal-chrome border-b px-4 h-[3.25rem] flex items-center justify-between safe-area-pt flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeTab !== 'home' ? (
              <button onClick={() => goToTab('home')} className="p-2 -ml-1 rounded-xl hover:bg-slate-100/80 text-slate-500 transition-colors">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            ) : (
              <HumanifyLogo size="sm" variant="mark" className="flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight leading-tight">
                {headerTitle}
              </h1>
              {activeTab === 'home' && (
                <p className="text-[10px] text-slate-400 font-medium truncate">Employee Self-Service</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={fetchAll} className="p-2 rounded-xl hover:bg-slate-100/80 transition-colors" aria-label="Refresh">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={() => showNotif ? setShowNotif(false) : openNotifications()} className="relative p-2 rounded-xl hover:bg-slate-100/80 transition-colors" aria-label="Notifikasi">
              <Bell className="w-[18px] h-[18px] text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-violet-600 rounded-full text-[9px] text-white font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {showNotif && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowNotif(false)} />
            <div className="absolute top-[3.25rem] right-3 left-3 z-50 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 max-h-80 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">Notifikasi</span>
                {unreadCount > 0 && <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full ring-1 ring-violet-200">{unreadCount} baru</span>}
              </div>
              {notifications.length === 0 ? <p className="p-6 text-sm text-slate-400 text-center">Tidak ada notifikasi</p> :
                notifications.map((n: any) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left p-4 border-b border-slate-50 last:border-0 active:bg-slate-50 ${n.read ? '' : 'bg-blue-50/50'}`}
                  >
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </button>
                ))
              }
            </div>
          </>
        )}

        <main ref={mainScrollRef} className="emp-portal-scroll px-4 py-4 pb-32 bg-[#f8fafc]">{renderContent()}</main>

        {renderModal()}

        {clockPhotoModal && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50">
            <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 space-y-4 safe-area-pb max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">
                  {clockPhotoModal === 'in' ? 'Absensi Foto Masuk' : 'Absensi Foto Pulang'}
                </h3>
                <button onClick={() => { setClockPhotoModal(null); setClockPhoto(null); }}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <p className="text-xs text-slate-500">Ambil selfie sebagai bukti kehadiran. GPS dan tag geofencing akan dicatat otomatis.</p>
              <PhotoCaptureField
                label="Foto Selfie *"
                hint="Pastikan wajah terlihat jelas."
                value={clockPhoto}
                onChange={setClockPhoto}
                capture="user"
              />
              <button
                onClick={() => handlePhotoClock(clockPhotoModal)}
                disabled={!clockPhoto || clocking === clockPhotoModal}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 active:scale-95 transition-all ${
                  clockPhotoModal === 'in' ? 'bg-emerald-600' : 'bg-orange-500'
                }`}
              >
                {clocking === clockPhotoModal ? <><Loader2 className="w-4 h-4 animate-spin" />Memproses...</> : <><Camera className="w-4 h-4" />{clockPhotoModal === 'in' ? 'Clock In dengan Foto' : 'Clock Out dengan Foto'}</>}
              </button>
            </div>
          </div>
        )}

        {/* More menu — bottom sheet */}
        {showMoreMenu && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 md:max-w-lg md:mx-auto" onClick={() => setShowMoreMenu(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto animate-slide-up">
              <div className="bg-white/95 backdrop-blur-xl rounded-t-3xl shadow-[0_-8px_40px_rgba(15,23,42,0.12)] border-t border-slate-200/60 safe-area-pb">
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-slate-300/80" />
                </div>
                <div className="px-5 pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900 tracking-tight">Menu Lainnya</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Klaim, lembur, perjalanan & profil</p>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2.5">
                  {moreMenuItems.map(item => (
                    <button
                      key={item.key}
                      onClick={() => goToTab(item.key)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left active:scale-[0.98] transition-all ${
                        activeTab === item.key
                          ? 'border-violet-300 bg-violet-50/80 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <nav className="fixed bottom-0 left-0 right-0 z-40 emp-portal-nav max-w-md mx-auto safe-area-pb md:rounded-b-[2rem]">
          <div className="mx-3 mb-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/70 shadow-[0_-4px_24px_rgba(15,23,42,0.08)]">
            <div className="flex items-stretch justify-around py-1 px-1">
            {tabs.map(tab => {
              const isMore = tab.key === 'more';
              const isActive = isMore
                ? secondaryTabs.has(activeTab) || showMoreMenu
                : activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleNavClick(tab.key)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl min-w-0 flex-1 transition-all duration-200 ${
                    isActive ? 'text-violet-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-violet-50 -z-10" />
                  )}
                  <div className={`relative p-1 ${isActive ? 'text-violet-600' : ''}`}>
                    <tab.icon className={`w-5 h-5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-[9px] font-semibold leading-none tracking-wide ${isActive ? 'text-violet-700' : 'text-slate-400'}`}>
                    {tab.label}
                  </span>
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute top-0.5 right-2 min-w-[14px] h-3.5 px-0.5 bg-violet-600 rounded-full text-[8px] text-white font-bold flex items-center justify-center ring-2 ring-white">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
            </div>
          </div>
        </nav>
      </div>
      </div>

      <style jsx global>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.28s ease-out; }
        .safe-area-pb { padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px); }
        .safe-area-pt { padding-top: env(safe-area-inset-top, 0px); }
        html, body { -webkit-tap-highlight-color: transparent; overscroll-behavior-y: none; }
        body.employee-portal-active { overflow: hidden; position: fixed; width: 100%; height: 100%; }
        .emp-portal-root {
          height: 100dvh;
          max-height: 100dvh;
          overflow: hidden;
          touch-action: manipulation;
        }
        .emp-portal-scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior-y: contain;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: auto;
        }
        .emp-portal-tab {
          content-visibility: auto;
          contain-intrinsic-size: auto 480px;
        }
        .emp-portal-chrome {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-color: rgb(226 232 240 / 0.7);
        }
        .emp-portal-nav {
          background: transparent;
          border: none;
        }
        @media (max-width: 768px) {
          .emp-portal-desktop-frame { border-radius: 0; box-shadow: none; }
          .emp-portal-outer { background: #f8fafc !important; padding: 0 !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-slide-up { animation: none !important; }
        }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
