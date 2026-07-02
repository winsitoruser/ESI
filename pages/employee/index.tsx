import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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
  CheckSquare, AlertCircle, Map, ScanLine, Timer, Banknote
} from 'lucide-react';
import { signOut } from 'next-auth/react';

type TabKey = 'home' | 'attendance' | 'overtime' | 'kpi' | 'leave' | 'claims' | 'travel' | 'visit' | 'profile';

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
  next_visit_date: string | null; evidence_photos: string[];
}
type ModalType = 'leave' | 'claim' | 'travel' | null;

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

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

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Disetujui' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Menunggu' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Ditolak' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Selesai' },
    reimbursed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Dibayar' },
    present: { bg: 'bg-green-100', text: 'text-green-700', label: 'Hadir' },
  };
  const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
};

const claimTypeLabel = (v: string) => CLAIM_TYPES.find(c => c.value === v)?.label || v;

// ─── API Helper ───
const api = async (action: string, method = 'GET', body?: any) => {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`/api/employee/dashboard?action=${action}`, opts);
  return r.json();
};

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Field Visit state ──────────────────────────────────────────────────────
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [visitStats, setVisitStats] = useState({ total: 0, planned: 0, checked_in: 0, completed: 0, target: 5 });
  const [visitLoading, setVisitLoading] = useState(false);
  const [activeVisit, setActiveVisit] = useState<FieldVisit | null>(null);
  const [visitModal, setVisitModal] = useState<'check-in' | 'check-out' | 'new-visit' | 'evidence' | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [visitForm, setVisitForm] = useState({ customer_name: '', visit_type: 'regular' as VisitType, purpose: '', outcome: '' as VisitOutcome | '', outcome_notes: '', order_value: '', next_visit_date: '', caption: '' });
  const [visitMsg, setVisitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Data State ───
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [travel, setTravel] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

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

  // ─── Data Fetching ───
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes, kRes, lbRes, lrRes, cRes, trRes, nRes] = await Promise.all([
        api('profile'), api('attendance'), api('kpi'),
        api('leave-balance'), api('leave-requests'),
        api('claims'), api('travel'), api('notifications'),
      ]);
      setProfile(pRes.data || null);
      setAttendance(aRes.data || null);
      setKpi(kRes.data || null);
      setLeaveBalance(Array.isArray(lbRes.data) ? lbRes.data : []);
      setLeaveRequests(Array.isArray(lrRes.data) ? lrRes.data : []);
      setClaims(Array.isArray(cRes.data) ? cRes.data : []);
      setTravel(Array.isArray(trRes.data) ? trRes.data : []);
      setNotifications(Array.isArray(nRes.data) ? nRes.data : []);
    } catch (e) {
      console.error('Fetch error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchAll(); }, [mounted, fetchAll]);

  // ── Field Visit: Fetch ─────────────────────────────────────────────────────
  const fetchVisits = useCallback(async () => {
    setVisitLoading(true);
    try {
      const res = await fetch(`/api/employee/field-visit?action=visits`);
      const data = await res.json();
      if (data.success) {
        setVisits(data.data.visits || []);
        setVisitStats(data.data.stats || { total: 0, planned: 0, checked_in: 0, completed: 0, target: 5 });
      }
    } catch { /* use existing mock */ }
    finally { setVisitLoading(false); }
  }, []);
  useEffect(() => { if (mounted && activeTab === 'visit') fetchVisits(); }, [mounted, activeTab, fetchVisits]);

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
    setGpsLoading(true); setVisitMsg(null);
    try {
      const coords = await getGps();
      setGpsCoords(coords);
      const res = await fetch('/api/employee/field-visit?action=check-in', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: activeVisit.id, latitude: coords.lat, longitude: coords.lng, accuracy: coords.accuracy }),
      });
      const data = await res.json();
      if (data.success) {
        setVisitMsg({ type: 'success', text: 'Check-in berhasil! Lokasi & waktu tercatat.' });
        setVisits(prev => prev.map(v => v.id === activeVisit.id ? { ...v, status: 'checked_in', check_in_time: new Date().toISOString(), check_in_lat: coords.lat, check_in_lng: coords.lng } : v));
        setTimeout(() => { setVisitModal(null); setActiveVisit(null); setVisitMsg(null); }, 1800);
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
        body: JSON.stringify({ visit_id: activeVisit.id, latitude: coords?.lat, longitude: coords?.lng, outcome: visitForm.outcome, outcome_notes: visitForm.outcome_notes, order_taken: visitForm.outcome === 'order_taken', order_value: Number(visitForm.order_value) || 0, next_visit_date: visitForm.next_visit_date }),
      });
      const data = await res.json();
      if (data.success) {
        setVisitMsg({ type: 'success', text: 'Check-out berhasil! Hasil kunjungan tersimpan.' });
        setVisits(prev => prev.map(v => v.id === activeVisit.id ? { ...v, status: 'completed', check_out_time: new Date().toISOString(), outcome: visitForm.outcome as VisitOutcome } : v));
        setVisitStats(prev => ({ ...prev, completed: prev.completed + 1, checked_in: Math.max(0, prev.checked_in - 1) }));
        setTimeout(() => { setVisitModal(null); setActiveVisit(null); setVisitMsg(null); setVisitForm(f => ({ ...f, outcome: '', outcome_notes: '', order_value: '', next_visit_date: '' })); }, 1800);
      } else setVisitMsg({ type: 'error', text: data.error || 'Gagal check-out' });
    } catch (e: any) { setVisitMsg({ type: 'error', text: e.message }); }
    finally { setGpsLoading(false); }
  };

  // ── Field Visit: Create new (walk-in / planned) ─────────────────────────────
  const handleCreateVisit = async () => {
    if (!visitForm.customer_name) { setVisitMsg({ type: 'error', text: 'Nama pelanggan wajib diisi' }); return; }
    setSubmitting(true); setVisitMsg(null);
    try {
      const res = await fetch('/api/employee/field-visit?action=create-visit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: visitForm.customer_name, visit_type: visitForm.visit_type, purpose: visitForm.purpose, is_adhoc: true }),
      });
      const data = await res.json();
      if (data.success) {
        setVisitMsg({ type: 'success', text: 'Kunjungan baru berhasil dibuat!' });
        if (data.data) setVisits(prev => [data.data, ...prev]);
        setVisitStats(prev => ({ ...prev, total: prev.total + 1, planned: prev.planned + 1 }));
        setTimeout(() => { setVisitModal(null); setVisitMsg(null); setVisitForm(f => ({ ...f, customer_name: '', purpose: '' })); }, 1800);
      } else setVisitMsg({ type: 'error', text: data.error || 'Gagal membuat kunjungan' });
    } catch { setVisitMsg({ type: 'error', text: 'Gagal membuat kunjungan' }); }
    finally { setSubmitting(false); }
  };

  // ─── Actions ───
  const handleClockIn = async () => {
    try {
      const res = await api('clock-in', 'POST');
      if (res.success) {
        toast.success(`Clock-in berhasil: ${res.data?.checkIn}`);
        setAttendance((prev: any) => ({ ...prev, today: { ...prev?.today, check_in: res.data?.checkIn, status: 'present' } }));
      }
    } catch { toast.error('Gagal clock-in'); }
  };

  const handleClockOut = async () => {
    try {
      const res = await api('clock-out', 'POST');
      if (res.success) {
        toast.success(`Clock-out berhasil: ${res.data?.checkOut}`);
        setAttendance((prev: any) => ({ ...prev, today: { ...prev?.today, check_out: res.data?.checkOut } }));
      }
    } catch { toast.error('Gagal clock-out'); }
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
  const monthAttendance = attendance?.thisMonth || { present: 0, late: 0, absent: 0, leave: 0 };
  const kpiScore = kpi?.overallScore || 0;
  const kpiMetrics = kpi?.metrics || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'pending');
  const pendingClaims = claims.filter((c: any) => c.status === 'pending');
  const pendingTravel = travel.filter((tr: any) => tr.status === 'pending');

  if (!mounted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Selamat Pagi', icon: <Sunrise className="w-5 h-5 text-orange-400" /> };
    if (h < 17) return { text: 'Selamat Siang', icon: <Sun className="w-5 h-5 text-yellow-400" /> };
    return { text: 'Selamat Malam', icon: <Moon className="w-5 h-5 text-indigo-400" /> };
  };
  const greeting = getGreeting();

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
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">{greeting.icon}<span className="text-sm opacity-90">{greeting.text}</span></div>
          <div className="text-xs opacity-75">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <h2 className="text-xl font-bold mb-1">{userName}</h2>
        <p className="text-sm opacity-80">{userPosition} · {userDept}</p>
        <div className="flex items-center gap-1.5 mt-2 text-xs opacity-75"><Building2 className="w-3.5 h-3.5" />{userBranch}</div>
      </div>

      {/* Attendance + Clock */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">Kehadiran Hari Ini</h3>
          {todayAttendance?.status && <StatusBadge status={todayAttendance.status} />}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <Clock className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{todayAttendance?.check_in?.substring(0, 5) || '--:--'}</p>
            <p className="text-[11px] text-green-600">Masuk</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-orange-700">{todayAttendance?.check_out?.substring(0, 5) || '--:--'}</p>
            <p className="text-[11px] text-orange-600">Pulang</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={handleClockIn} disabled={!!todayAttendance?.check_in}
            className={`py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${todayAttendance?.check_in ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
            <Fingerprint className="w-4 h-4" /> Clock In
          </button>
          <button onClick={handleClockOut} disabled={!todayAttendance?.check_in || !!todayAttendance?.check_out}
            className={`py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${!todayAttendance?.check_in || todayAttendance?.check_out ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
            <Fingerprint className="w-4 h-4" /> Clock Out
          </button>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Hadir: <b className="text-gray-700">{monthAttendance.present}</b></span>
          <span>Terlambat: <b className="text-yellow-600">{monthAttendance.late}</b></span>
          <span>Izin: <b className="text-blue-600">{monthAttendance.leave}</b></span>
          <span>Absen: <b className="text-red-600">{monthAttendance.absent}</b></span>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">Skor KPI</h3>
          <button onClick={() => setActiveTab('kpi')} className="text-xs text-blue-600 font-medium">Detail →</button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                stroke={kpiScore >= 80 ? '#22c55e' : kpiScore >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3" strokeDasharray={`${kpiScore}, 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{kpiScore}</span>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1.5">
            {kpiMetrics.slice(0, 4).map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                {m.trend === 'up' ? <TrendingUp className="w-3 h-3 text-green-500" /> : m.trend === 'down' ? <TrendingDown className="w-3 h-3 text-red-500" /> : <BarChart3 className="w-3 h-3 text-gray-400" />}
                <span className="text-gray-600 truncate">{m.name}</span>
                <span className="font-semibold ml-auto">{m.actual}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">Aksi Cepat</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Calendar, label: 'Ajukan Cuti',  color: 'bg-blue-500',   action: () => setModal('leave') },
            { icon: Receipt,  label: 'Klaim Baru',   color: 'bg-green-500',  action: () => setModal('claim') },
            { icon: Timer,    label: 'Ajukan Lembur',color: 'bg-orange-500', action: () => { setActiveTab('overtime'); setTimeout(() => setOtModal('new'), 100); } },
            { icon: Target,   label: 'KPI Saya',     color: 'bg-purple-500', action: () => setActiveTab('kpi') },
          ].map((a, i) => (
            <button key={i} onClick={a.action} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
              <div className={`${a.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
                <a.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending Items */}
      {(pendingLeaves.length > 0 || pendingClaims.length > 0 || pendingTravel.length > 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Menunggu Persetujuan</h3>
          <div className="space-y-2">
            {pendingLeaves.map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 p-2.5 bg-yellow-50 rounded-lg">
                <Calendar className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{l.leave_type_name || l.leave_type} - {l.reason}</p>
                  <p className="text-[11px] text-gray-500">{fmtDate(l.start_date || l.startDate)} · {l.total_days || l.totalDays} hari</p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
            {pendingClaims.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 bg-yellow-50 rounded-lg">
                <Receipt className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">Klaim {claimTypeLabel(c.claim_type)} - {c.description}</p>
                  <p className="text-[11px] text-gray-500">{fmtCur(c.amount)}</p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
            {pendingTravel.map((tr: any) => (
              <div key={tr.id} className="flex items-center gap-3 p-2.5 bg-yellow-50 rounded-lg">
                <Plane className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">Perjalanan {tr.destination}</p>
                  <p className="text-[11px] text-gray-500">{fmtDate(tr.departure_date)} - {fmtDate(tr.return_date)}</p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Notifikasi Terbaru</h3>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n: any) => (
              <div key={n.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${n.read ? 'bg-gray-50' : 'bg-blue-50'}`}>
                {n.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> :
                 n.type === 'error' ? <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /> :
                 <Bell className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-[11px] text-gray-500">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{userName}</h3>
        <p className="text-sm text-gray-500">{userPosition}</p>
        <p className="text-xs text-gray-400 mt-1">{userCode}</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Informasi</h3>
        <div className="space-y-3">
          {[
            { icon: Building2, label: 'Departemen', value: userDept },
            { icon: MapPin, label: 'Cabang', value: userBranch },
            { icon: Briefcase, label: 'Email', value: userEmail },
            { icon: Clock, label: 'Bergabung', value: fmtDate(userJoinDate) },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-900">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Link href="/hq/hris/ess" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-gray-500" /><span className="text-sm font-medium text-gray-700">Portal ESS Lengkap</span></div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
        <Link href="/hq/dashboard" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-gray-500" /><span className="text-sm font-medium text-gray-700">HQ Dashboard</span></div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/auth/login' })} className="w-full flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-red-100">
          <div className="flex items-center gap-3"><LogOut className="w-5 h-5 text-red-500" /><span className="text-sm font-medium text-red-600">Keluar</span></div>
          <ChevronRight className="w-4 h-4 text-red-400" />
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
          {visits.map(v => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{v.customer_name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{v.customer_address}</span></p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[v.status]}`}>{statusLabel[v.status]}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${visitTypeColor[v.visit_type]}`}>{visitTypeLabel[v.visit_type]}</span>
                  {v.purpose && <p className="text-xs text-gray-500 truncate">{v.purpose}</p>}
                </div>
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
                {/* Action buttons per status */}
                <div className="flex gap-2">
                  {v.status === 'planned' && (
                    <button onClick={() => { setActiveVisit(v); setVisitModal('check-in'); setGpsCoords(null); setVisitMsg(null); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all">
                      <Navigation className="w-3.5 h-3.5" /> Check-in
                    </button>
                  )}
                  {v.status === 'checked_in' && <>
                    <button onClick={() => { setActiveVisit(v); setVisitModal('evidence'); setVisitMsg(null); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 text-white py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all">
                      <Camera className="w-3.5 h-3.5" /> Foto Bukti
                    </button>
                    <button onClick={() => { setActiveVisit(v); setVisitModal('check-out'); setVisitForm(f => ({ ...f, outcome: '', outcome_notes: '', order_value: '', next_visit_date: '' })); setVisitMsg(null); }}
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
          ))}
        </div>
      )}

      {/* ── Modal: Check-in ─────────────────────────────────────────────────── */}
      {visitModal === 'check-in' && activeVisit && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-pb">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Check-in Kunjungan</h3>
              <button onClick={() => setVisitModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="font-semibold text-sm text-gray-900">{activeVisit.customer_name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{activeVisit.customer_address}</p>
            </div>
            {gpsCoords && <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div><p className="text-xs font-semibold text-green-700">Koordinat GPS diperoleh</p>
                <p className="text-[10px] text-green-600">{gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)} (±{Math.round(gpsCoords.accuracy)}m)</p></div>
            </div>}
            {visitMsg && <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${visitMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {visitMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{visitMsg.text}
            </div>}
            <p className="text-xs text-gray-400 flex items-center gap-1"><ScanLine className="w-3 h-3" />Lokasi GPS Anda akan dicatat sebagai bukti kehadiran.</p>
            <button onClick={handleCheckIn} disabled={gpsLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">
              {gpsLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Mendapatkan GPS...</> : <><Navigation className="w-4 h-4" />Check-in Sekarang</>}
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
            {visitMsg && <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${visitMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {visitMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{visitMsg.text}
            </div>}
            <label className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl text-sm font-semibold active:scale-95 transition-all cursor-pointer">
              <Camera className="w-4 h-4" /> Ambil / Pilih Foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  setSubmitting(true);
                  const res = await fetch('/api/employee/field-visit?action=add-evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visit_id: activeVisit.id, photo_base64: reader.result, caption: visitForm.caption }) });
                  const data = await res.json();
                  setVisitMsg({ type: data.success ? 'success' : 'error', text: data.message || data.error });
                  setSubmitting(false);
                };
                reader.readAsDataURL(file);
              }} />
            </label>
            <p className="text-[10px] text-gray-400 text-center">Foto disimpan sebagai bukti kunjungan lapangan</p>
          </div>
        </div>
      )}

      {/* ── Modal: New Visit ────────────────────────────────────────────────── */}
      {visitModal === 'new-visit' && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 safe-area-pb">
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
            <button onClick={handleCreateVisit} disabled={submitting || !visitForm.customer_name}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><Plus className="w-4 h-4" />Buat Kunjungan</>}
            </button>
          </div>
        </div>
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

  const tabs: { key: TabKey; icon: any; label: string }[] = [
    { key: 'home',       icon: Home,        label: 'Beranda'   },
    { key: 'attendance', icon: CalendarDays, label: 'Absensi'  },
    { key: 'kpi',        icon: Target,       label: 'KPI'      },
    { key: 'claims',     icon: Wallet,       label: 'Klaim'    },
    { key: 'visit',      icon: Navigation,   label: 'Kunjungan'},
    { key: 'profile',    icon: User,         label: 'Profil'   },
  ];

  const renderContent = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
    switch (activeTab) {
      case 'home':       return renderHome();
      case 'attendance': return renderAttendance();
      case 'overtime':   return renderOvertime();
      case 'kpi':        return renderKPI();
      case 'leave':      return renderLeave();
      case 'claims':     return renderClaims();
      case 'travel':     return renderTravel();
      case 'visit':      return renderVisit();
      case 'profile':    return renderProfile();
    }
  };

  return (
    <>
      <Head>
        <title>Employee Dashboard | BEDAGANG</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />

      <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900">
            {activeTab === 'home' ? 'Employee Portal' : tabs.find(t => t.key === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-1">
            <button onClick={fetchAll} className="p-2 rounded-full hover:bg-gray-100"><RefreshCw className="w-4.5 h-4.5 text-gray-500" /></button>
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-full hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">{unreadCount}</span>}
            </button>
          </div>
        </header>

        {showNotif && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
            <div className="absolute top-14 right-2 left-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-sm">Notifikasi</span>
              </div>
              {notifications.length === 0 ? <p className="p-4 text-sm text-gray-400 text-center">Tidak ada notifikasi</p> :
                notifications.map((n: any) => (
                  <div key={n.id} className={`p-3 border-b border-gray-50 ${n.read ? '' : 'bg-blue-50/50'}`}>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                  </div>
                ))
              }
            </div>
          </>
        )}

        <main className="px-4 py-4 pb-24">{renderContent()}</main>

        {renderModal()}

        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 max-w-lg mx-auto safe-area-pb">
          <div className="flex items-center justify-around py-1.5 px-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 flex-1 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  <tab.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <style jsx global>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .safe-area-pb { padding-bottom: env(safe-area-inset-bottom, 0px); }
      `}</style>
    </>
  );
}
