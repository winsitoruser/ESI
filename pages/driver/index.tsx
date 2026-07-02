/**
 * Driver / Armada Portal — mobile-first self-service
 *
 * Terintegrasi:
 *   HRIS  (users / employees / attendance / leave / claims)
 *   FMS   (fleet_vehicles / maintenance / fuel transactions)
 *   TMS   (fleet_routes / route_assignments)
 *   GIS   (fleet_gps_locations → Leaflet map)
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession, signOut } from 'next-auth/react';
import toast, { Toaster } from 'react-hot-toast';
import * as gpsQueue from '@/lib/driver/offlineGpsQueue';
import {
  User, Home, Truck, MapPin, Navigation, CalendarDays,
  Bell, RefreshCw, Loader2, Play, Square, Pause, Fuel, AlertTriangle,
  CheckCircle, XCircle, Clock, Target, TrendingUp, TrendingDown,
  Sunrise, Sun, Moon, Send, X, Plus, ChevronRight, Award, Shield,
  LogOut, Wallet, Gauge, Phone, Star, Activity, AlertCircle, Zap,
  FileText, Wrench, Building2, Flag, Package, Camera, Upload,
  Map as RouteIcon
} from 'lucide-react';

const Route = RouteIcon;

// ── Reusable photo uploader (camera capture + preview) ────────────────
function PhotoUploader({
  kind, photos, onChange, max = 4, color = 'blue', uploadingState,
}: {
  kind: PhotoKind;
  photos: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  color?: 'blue' | 'purple' | 'emerald' | 'pink';
  uploadingState?: [boolean, (v: boolean) => void];
}) {
  const [localBusy, setLocalBusy] = useState(false);
  const busy = uploadingState ? uploadingState[0] : localBusy;
  const setBusy = uploadingState ? uploadingState[1] : setLocalBusy;

  const pick = (capture = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) (input as any).capture = 'environment';
    input.multiple = max > 1;
    input.onchange = async () => {
      const files = Array.from(input.files || []).slice(0, Math.max(1, max - photos.length));
      if (files.length === 0) return;
      setBusy(true);
      try {
        const urls = await uploadPhotosApi(kind, files);
        onChange([...photos, ...urls].slice(0, max));
        toast.success(`${urls.length} foto terunggah`);
      } catch (e: any) {
        toast.error(e?.message || 'Upload gagal');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const btnCls = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
  }[color];

  return (
    <div>
      <label className="text-xs font-semibold text-gray-700">
        Foto <span className="text-gray-400">({photos.length}/{max})</span>
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        {photos.map((u, i) => (
          <div key={u} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((p) => p !== u))}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <>
            <button
              type="button"
              onClick={() => pick(true)}
              disabled={busy}
              className={`w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${btnCls} disabled:opacity-50`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Kamera
            </button>
            <button
              type="button"
              onClick={() => pick(false)}
              disabled={busy}
              className={`w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${btnCls} disabled:opacity-50`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Galeri
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Map component (client-only) ────────────────────────────────────────
const DriverMap = dynamic(() => import('@/components/driver/DriverMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
});

// ═══════════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════════
type TabKey = 'home' | 'trips' | 'map' | 'vehicle' | 'hr' | 'profile';

interface Profile {
  id: string;
  driver_number: string;
  full_name: string;
  phone: string;
  email: string;
  license_number: string;
  license_type: string;
  license_expiry_date: string;
  branch_name?: string;
  photo_url?: string | null;
  status: string;
  availability_status: string;
  assigned_vehicle?: {
    id: string;
    vehicle_number: string;
    license_plate: string;
    vehicle_type: string;
    brand?: string;
    model?: string;
    year?: number;
    current_odometer_km?: number;
  } | null;
  total_deliveries: number;
  on_time_deliveries: number;
  total_distance_km: number;
  safety_score: number;
  customer_rating: number;
  hire_date?: string;
  employment_type?: string;
}

interface Trip {
  id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  scheduled_start_time?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  total_distance_km?: number | null;
  fuel_consumed_liters?: number | null;
  route_number?: string;
  route_name?: string;
  route_type?: string;
  start_location?: string;
  end_location?: string;
  route_distance_km?: number;
  estimated_duration_minutes?: number;
  stops?: any;
  vehicle_id?: string;
  vehicle_number?: string;
  license_plate?: string;
  current_odometer_km?: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════
//  Utils
// ═══════════════════════════════════════════════════════════════════════
const fmtCur = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtTime = (d?: string | null) =>
  d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

const api = async (action: string, method = 'GET', body?: any, extraQuery = '') => {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`/api/driver/dashboard?action=${action}${extraQuery}`, opts);
  return r.json();
};

type PhotoKind = 'inspection' | 'pod' | 'expense' | 'incident' | 'general';

const uploadPhotosApi = async (kind: PhotoKind, files: File[]): Promise<string[]> => {
  if (!files || files.length === 0) return [];
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const r = await fetch(`/api/driver/upload?kind=${kind}`, { method: 'POST', body: fd });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Upload failed');
  return (j.data || []).map((d: any) => d.url as string);
};

const TRIP_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  scheduled:  { label: 'Terjadwal',     bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400' },
  in_progress:{ label: 'Berjalan',      bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500 animate-pulse' },
  completed:  { label: 'Selesai',       bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled:  { label: 'Dibatalkan',    bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400' },
};

const AVAIL: Record<string, { label: string; bg: string; text: string }> = {
  available: { label: 'Siap Bertugas', bg: 'bg-green-100', text: 'text-green-700' },
  on_duty:   { label: 'Sedang Bertugas', bg: 'bg-blue-100', text: 'text-blue-700' },
  off_duty:  { label: 'Off Duty',      bg: 'bg-gray-100', text: 'text-gray-600' },
};

// ═══════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════
export default function DriverPortal() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [loading, setLoading] = useState(true);
  const [showNotif, setShowNotif] = useState(false);

  // Data states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsRecap, setTripsRecap] = useState<any>(null);
  const [tripMonth, setTripMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [vehicle, setVehicle] = useState<any>(null);
  const [fuelLog, setFuelLog] = useState<any>({ records: [], total_liters: 0, total_cost: 0 });
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [hr, setHr] = useState<any>(null);
  const [gps, setGps] = useState<any>({ points: [], latest: null });
  const [notifications, setNotifications] = useState<any[]>([]);

  // Modal + form state
  const [modal, setModal] = useState<
    null | 'start-trip' | 'complete-trip' | 'fuel' | 'incident' | 'pause-trip'
    | 'inspection' | 'pod' | 'expense'
  >(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [tripForm, setTripForm] = useState({ odometer: '', distance_km: '', fuel_liters: '', notes: '' });
  const [fuelForm, setFuelForm] = useState({ fuel_station: '', fuel_type: 'diesel', quantity_liters: '', price_per_liter: '', odometer_reading: '', receipt_number: '', payment_method: 'fuel_card', notes: '' });
  const [incidentForm, setIncidentForm] = useState({ incident_type: 'accident', description: '' });
  const [pauseReason, setPauseReason] = useState('');

  // Pre-trip inspection checklist
  const INSPECTION_ITEMS: { key: string; label: string }[] = [
    { key: 'tires',      label: 'Kondisi ban & tekanan angin' },
    { key: 'lights',     label: 'Lampu depan/belakang/sein'   },
    { key: 'brakes',     label: 'Rem kaki & rem tangan'       },
    { key: 'mirrors',    label: 'Kaca spion kiri & kanan'     },
    { key: 'oil',        label: 'Level oli mesin'             },
    { key: 'coolant',    label: 'Air radiator'                },
    { key: 'wiper',      label: 'Wiper & air wiper'           },
    { key: 'horn',       label: 'Klakson berfungsi'           },
    { key: 'seatbelt',   label: 'Sabuk pengaman'              },
    { key: 'spare_tire', label: 'Ban serep & dongkrak'        },
    { key: 'toolkit',    label: 'Toolkit / segitiga pengaman' },
    { key: 'documents',  label: 'STNK/SIM/surat jalan lengkap'},
  ];
  const [inspectionForm, setInspectionForm] = useState<{
    checklist: Record<string, 'ok' | 'issue'>;
    issues: Record<string, string>;
    odometer: string; fuel: string; notes: string;
  }>({ checklist: {}, issues: {}, odometer: '', fuel: '', notes: '' });
  const [latestInspection, setLatestInspection] = useState<any>(null);

  // POD form
  const [podForm, setPodForm] = useState({
    recipient_name: '', recipient_phone: '', recipient_role: '',
    reference_number: '', notes: '', stop_index: '',
  });
  const podSigRef = useRef<HTMLCanvasElement | null>(null);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    category: 'toll', amount: '', description: '',
    receipt_number: '', payment_method: 'cash', notes: '',
  });
  const [expenses, setExpenses] = useState<any>({ records: [], summary: { total_amount: 0, by_category: {} } });
  const [shiftSummary, setShiftSummary] = useState<any>(null);

  // Photos (upload local → URLs) per modal
  const [inspPhotos, setInspPhotos] = useState<string[]>([]);
  const [podPhotos, setPodPhotos] = useState<string[]>([]);
  const [expensePhoto, setExpensePhoto] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Online / offline indicator
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queuedPings, setQueuedPings] = useState<number>(0);

  const trackerRef = useRef<number | null>(null);

  // ── Fetch everything ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, t, v, perf, gpsRes, nRes, hrRes] = await Promise.all([
        api('profile'),
        api('summary'),
        api('today-trip'),
        api('vehicle'),
        api('performance'),
        api('gps-history', 'GET', undefined, '&limit=100'),
        api('notifications'),
        api('hr-summary'),
      ]);
      setProfile(p.data || null);
      setSummary(s.data || null);
      setTodayTrips(Array.isArray(t.data) ? t.data : []);
      setVehicle(v.data || null);
      setPerformance(perf.data || null);
      setGps(gpsRes.data || { points: [], latest: null });
      setNotifications(Array.isArray(nRes.data) ? nRes.data : []);
      setHr(hrRes.data || null);
    } catch (e) {
      console.error('fetch failed', e);
    }
    setLoading(false);
  }, []);

  const fetchTrips = useCallback(async (month: string) => {
    const r = await api('trips', 'GET', undefined, `&month=${month}`);
    if (r.success && r.data) { setTrips(r.data.trips || []); setTripsRecap(r.data.recap || null); }
  }, []);

  const fetchFuel = useCallback(async () => {
    const r = await api('fuel-log');
    if (r.success && r.data) setFuelLog(r.data);
  }, []);

  const fetchMaintenance = useCallback(async () => {
    const r = await api('maintenance');
    if (r.success) setMaintenance(Array.isArray(r.data) ? r.data : []);
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchAll(); }, [mounted, fetchAll]);
  useEffect(() => { if (mounted && activeTab === 'trips') fetchTrips(tripMonth); }, [mounted, activeTab, tripMonth, fetchTrips]);
  useEffect(() => { if (mounted && activeTab === 'vehicle') { fetchFuel(); fetchMaintenance(); } }, [mounted, activeTab, fetchFuel, fetchMaintenance]);

  // ── Live GPS tracker (when a trip is in progress) ─────────────────────
  const activeInProgressTrip = useMemo(() => todayTrips.find(t => t.status === 'in_progress') || null, [todayTrips]);

  useEffect(() => {
    if (!mounted) return;
    if (!activeInProgressTrip) {
      if (trackerRef.current) { navigator.geolocation?.clearWatch(trackerRef.current); trackerRef.current = null; }
      return;
    }
    if (!navigator.geolocation || trackerRef.current) return;
    trackerRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy });
        try {
          await gpsQueue.pushGps({
            latitude, longitude,
            speed_kmh: speed ? Math.max(0, speed * 3.6) : 0,
            heading: heading && !Number.isNaN(heading) ? heading : 0,
            accuracy_meters: accuracy || null,
            timestamp: new Date().toISOString(),
          });
          setQueuedPings(await gpsQueue.queueSize());
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
    return () => {
      if (trackerRef.current) { navigator.geolocation.clearWatch(trackerRef.current); trackerRef.current = null; }
    };
  }, [mounted, activeInProgressTrip]);

  // Online/offline monitoring + auto-flush queue
  useEffect(() => {
    if (!mounted) return;
    const setOn = () => setOnline(true);
    const setOff = () => setOnline(false);
    window.addEventListener('online', setOn);
    window.addEventListener('offline', setOff);
    const stop = gpsQueue.startAutoFlush(async (r) => {
      if (r.sent > 0) toast.success(`${r.sent} GPS ping tersinkron`);
      setQueuedPings(await gpsQueue.queueSize());
    });
    gpsQueue.queueSize().then(setQueuedPings).catch(() => {});
    return () => {
      window.removeEventListener('online', setOn);
      window.removeEventListener('offline', setOff);
      stop();
    };
  }, [mounted]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const getGps = () =>
    new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('GPS tidak tersedia'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        (e) => reject(new Error('Gagal mendapatkan lokasi: ' + e.message)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const handleClockIn = async () => {
    try { const r = await api('clock-in', 'POST'); r.success ? toast.success(`Clock-in ${r.data?.check_in}`) : toast.error('Gagal'); fetchAll(); }
    catch { toast.error('Gagal clock-in'); }
  };
  const handleClockOut = async () => {
    try { const r = await api('clock-out', 'POST'); r.success ? toast.success(`Clock-out ${r.data?.check_out}`) : toast.error('Gagal'); fetchAll(); }
    catch { toast.error('Gagal clock-out'); }
  };

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    setSubmitting(true); setGpsLoading(true);
    try {
      const g = await getGps().catch(() => null);
      const r = await api('start-trip', 'POST', {
        assignment_id: activeTrip.id,
        latitude: g?.lat, longitude: g?.lng,
        odometer: Number(tripForm.odometer) || undefined,
      });
      if (r.success) { toast.success(r.message || 'Trip dimulai'); setModal(null); fetchAll(); }
      else toast.error(r.error || 'Gagal mulai trip');
    } catch (e: any) { toast.error(e?.message || 'Gagal mulai trip'); }
    finally { setSubmitting(false); setGpsLoading(false); }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    setSubmitting(true); setGpsLoading(true);
    try {
      const g = await getGps().catch(() => null);
      const r = await api('complete-trip', 'POST', {
        assignment_id: activeTrip.id,
        latitude: g?.lat, longitude: g?.lng,
        odometer: Number(tripForm.odometer) || undefined,
        distance_km: Number(tripForm.distance_km) || undefined,
        fuel_liters: Number(tripForm.fuel_liters) || undefined,
        notes: tripForm.notes,
      });
      if (r.success) {
        toast.success(r.message || 'Trip selesai');
        setModal(null); setActiveTrip(null);
        setTripForm({ odometer: '', distance_km: '', fuel_liters: '', notes: '' });
        fetchAll();
      } else toast.error(r.error || 'Gagal menyelesaikan trip');
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
    finally { setSubmitting(false); setGpsLoading(false); }
  };

  const handlePauseTrip = async () => {
    if (!activeTrip) return;
    setSubmitting(true);
    try {
      const r = await api('pause-trip', 'POST', { assignment_id: activeTrip.id, reason: pauseReason });
      if (r.success) { toast.success(r.message || 'Istirahat tercatat'); setModal(null); setPauseReason(''); }
      else toast.error(r.error || 'Gagal');
    } catch { toast.error('Gagal'); }
    finally { setSubmitting(false); }
  };

  const handleSubmitFuel = async () => {
    if (!fuelForm.quantity_liters || !fuelForm.price_per_liter) {
      toast.error('Liter & harga wajib diisi'); return;
    }
    setSubmitting(true);
    try {
      const r = await api('submit-fuel', 'POST', {
        ...fuelForm,
        quantity_liters: Number(fuelForm.quantity_liters),
        price_per_liter: Number(fuelForm.price_per_liter),
        odometer_reading: fuelForm.odometer_reading ? Number(fuelForm.odometer_reading) : null,
      });
      if (r.success) {
        toast.success(r.message || 'BBM tercatat');
        setModal(null);
        setFuelForm({ fuel_station: '', fuel_type: 'diesel', quantity_liters: '', price_per_liter: '', odometer_reading: '', receipt_number: '', payment_method: 'fuel_card', notes: '' });
        fetchFuel(); fetchAll();
      } else toast.error(r.error || 'Gagal simpan');
    } catch { toast.error('Gagal simpan'); }
    finally { setSubmitting(false); }
  };

  const handleReportIncident = async () => {
    if (!incidentForm.description) { toast.error('Deskripsi wajib diisi'); return; }
    setSubmitting(true);
    try {
      const g = await getGps().catch(() => null);
      const r = await api('report-incident', 'POST', {
        assignment_id: activeInProgressTrip?.id,
        incident_type: incidentForm.incident_type,
        description: incidentForm.description,
        latitude: g?.lat, longitude: g?.lng,
      });
      if (r.success) {
        toast.success(r.message || 'Insiden dilaporkan');
        setModal(null);
        setIncidentForm({ incident_type: 'accident', description: '' });
      } else toast.error(r.error || 'Gagal');
    } catch { toast.error('Gagal'); }
    finally { setSubmitting(false); }
  };

  // ── Pre-trip Inspection ───────────────────────────────────────────────
  const fetchLatestInspection = useCallback(async () => {
    const r = await api('pre-trip-check-latest');
    if (r.success) setLatestInspection(r.data || null);
  }, []);

  const openInspectionModal = () => {
    const base: Record<string, 'ok' | 'issue'> = {};
    INSPECTION_ITEMS.forEach((i) => (base[i.key] = 'ok'));
    setInspectionForm({ checklist: base, issues: {}, odometer: String(profile?.assigned_vehicle?.current_odometer_km || ''), fuel: '', notes: '' });
    setInspPhotos([]);
    setModal('inspection');
  };

  const handleSubmitInspection = async () => {
    const checklist = inspectionForm.checklist;
    const issues = Object.entries(inspectionForm.issues)
      .filter(([k, v]) => v && checklist[k] === 'issue')
      .map(([k, v]) => ({ item: k, note: v }));
    const hasIssue = Object.values(checklist).some((v) => v === 'issue');
    const overall_status = hasIssue ? (issues.length >= 3 ? 'fail' : 'pass_with_notes') : 'pass';

    setSubmitting(true); setGpsLoading(true);
    try {
      const g = await getGps().catch(() => null);
      const r = await api('submit-inspection', 'POST', {
        assignment_id: activeTrip?.id || null,
        inspection_type: 'pre_trip',
        odometer_reading: inspectionForm.odometer ? Number(inspectionForm.odometer) : null,
        fuel_level_percent: inspectionForm.fuel ? Number(inspectionForm.fuel) : null,
        checklist, issues_found: issues, overall_status, notes: inspectionForm.notes,
        photos: inspPhotos,
        latitude: g?.lat, longitude: g?.lng,
      });
      if (r.success) {
        toast.success(r.message || 'Inspeksi tersimpan');
        fetchLatestInspection();
        if (overall_status === 'fail') {
          toast.error('Kendaraan tidak layak — hubungi workshop');
          setModal(null);
        } else {
          setModal(null);
          if (activeTrip) {
            setTripForm((f) => ({ ...f, odometer: inspectionForm.odometer }));
            setTimeout(() => setModal('start-trip'), 200);
          }
        }
      } else toast.error(r.error || 'Gagal simpan inspeksi');
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
    finally { setSubmitting(false); setGpsLoading(false); }
  };

  // ── Proof of Delivery ─────────────────────────────────────────────────
  const openPodModal = (tripId?: string) => {
    setPodForm({ recipient_name: '', recipient_phone: '', recipient_role: '', reference_number: '', notes: '', stop_index: '' });
    setPodPhotos([]);
    setActiveTrip((prev) => prev || todayTrips.find((t) => t.id === tripId) || activeInProgressTrip || null);
    setModal('pod');
    setTimeout(() => initSignaturePad(), 150);
  };

  // Signature pad helpers
  const initSignaturePad = () => {
    const cv = podSigRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    let drawing = false;
    const getPos = (ev: any) => {
      const rect = cv.getBoundingClientRect();
      const t = ev.touches ? ev.touches[0] : ev;
      return { x: (t.clientX - rect.left) * (cv.width / rect.width), y: (t.clientY - rect.top) * (cv.height / rect.height) };
    };
    const start = (e: any) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move  = (e: any) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
    const end   = () => { drawing = false; };
    cv.onmousedown = start; cv.onmousemove = move; cv.onmouseup = end; cv.onmouseleave = end;
    cv.ontouchstart = start; cv.ontouchmove = move; cv.ontouchend = end;
  };
  const clearSignature = () => {
    const cv = podSigRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
  };
  const isSignatureEmpty = () => {
    const cv = podSigRef.current; if (!cv) return true;
    const ctx = cv.getContext('2d'); if (!ctx) return true;
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) return false;
    }
    return true;
  };

  const handleSubmitPod = async () => {
    if (!podForm.recipient_name) { toast.error('Nama penerima wajib diisi'); return; }
    if (isSignatureEmpty()) { toast.error('Tanda tangan wajib diisi'); return; }
    setSubmitting(true); setGpsLoading(true);
    try {
      const sig = podSigRef.current?.toDataURL('image/png') || null;
      const g = await getGps().catch(() => null);
      const r = await api('submit-pod', 'POST', {
        assignment_id: activeTrip?.id || activeInProgressTrip?.id,
        stop_index: podForm.stop_index ? Number(podForm.stop_index) : null,
        recipient_name: podForm.recipient_name,
        recipient_phone: podForm.recipient_phone,
        recipient_role: podForm.recipient_role,
        reference_number: podForm.reference_number,
        signature_data: sig, photos: podPhotos,
        latitude: g?.lat, longitude: g?.lng,
        notes: podForm.notes,
      });
      if (r.success) { toast.success(r.message || 'POD tersimpan'); setModal(null); }
      else toast.error(r.error || 'Gagal simpan POD');
    } catch (e: any) { toast.error(e?.message || 'Gagal'); }
    finally { setSubmitting(false); setGpsLoading(false); }
  };

  // ── Expense ──────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    const r = await api('expenses');
    if (r.success && r.data) setExpenses(r.data);
  }, []);

  const handleSubmitExpense = async () => {
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) { toast.error('Jumlah harus > 0'); return; }
    setSubmitting(true);
    try {
      const g = await getGps().catch(() => null);
      const r = await api('submit-expense', 'POST', {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        assignment_id: activeInProgressTrip?.id || null,
        receipt_photo_url: expensePhoto || null,
        latitude: g?.lat, longitude: g?.lng,
      });
      if (r.success) {
        toast.success(r.message || 'Expense tersimpan');
        setModal(null);
        setExpenseForm({ category: 'toll', amount: '', description: '', receipt_number: '', payment_method: 'cash', notes: '' });
        setExpensePhoto('');
        fetchExpenses();
      } else toast.error(r.error || 'Gagal simpan');
    } catch { toast.error('Gagal'); }
    finally { setSubmitting(false); }
  };

  // Fetch inspection + expense on mount, and when HR tab opened
  useEffect(() => { if (mounted) { fetchLatestInspection(); fetchExpenses(); } }, [mounted, fetchLatestInspection, fetchExpenses]);

  // Shift summary (dipakai di tab HR)
  const fetchShiftSummary = useCallback(async () => {
    const r = await api('shift-summary');
    if (r.success && r.data) setShiftSummary(r.data);
  }, []);
  useEffect(() => { if (mounted && activeTab === 'hr') fetchShiftSummary(); }, [mounted, activeTab, fetchShiftSummary]);

  // ── Maps helpers ──────────────────────────────────────────────────────
  const openInGoogleMaps = (loc: { lat?: number; lng?: number; name?: string } | string) => {
    let url = 'https://www.google.com/maps';
    if (typeof loc === 'string') {
      url += `/search/?api=1&query=${encodeURIComponent(loc)}`;
    } else if (loc.lat && loc.lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}${loc.name ? `&destination_place_id=${encodeURIComponent(loc.name)}` : ''}&travelmode=driving`;
    }
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openInGoogleMapsSearch = (q: string) => openInGoogleMaps(q);

  // ── Start-trip with pre-trip-inspection gating ─────────────────────────
  const promptStartTrip = async (trip: Trip) => {
    setActiveTrip(trip);
    setTripForm({
      odometer: String(profile?.assigned_vehicle?.current_odometer_km || ''),
      distance_km: '', fuel_liters: '', notes: '',
    });
    // re-check latest inspection
    const r = await api('pre-trip-check-latest');
    const insp = r?.data || null;
    setLatestInspection(insp);
    const today = new Date().toISOString().split('T')[0];
    const inspToday = insp && String(insp.created_at || '').startsWith(today) && insp.overall_status !== 'fail';
    if (!inspToday) {
      toast('Wajib inspeksi kendaraan sebelum mulai trip', { icon: '🔧' });
      openInspectionModal();
    } else {
      setModal('start-trip');
    }
  };

  // ── Derived values ────────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Selamat Pagi', icon: <Sunrise className="w-5 h-5 text-orange-400" /> };
    if (h < 17) return { text: 'Selamat Siang', icon: <Sun className="w-5 h-5 text-yellow-400" /> };
    return { text: 'Selamat Malam', icon: <Moon className="w-5 h-5 text-indigo-400" /> };
  }, []);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const allStops = useMemo(() => {
    const out: { name: string; lat: number; lng: number; address?: string }[] = [];
    todayTrips.forEach((t) => {
      const s = t.stops;
      if (Array.isArray(s)) s.forEach((x: any) => {
        if (typeof x?.lat === 'number' && typeof x?.lng === 'number') out.push({ name: x.name || 'Stop', lat: x.lat, lng: x.lng, address: x.address });
      });
    });
    return out;
  }, [todayTrips]);

  if (!mounted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  TAB: HOME
  // ═══════════════════════════════════════════════════════════════════════
  const renderHome = () => {
    const availStyle = AVAIL[profile?.availability_status || 'available'] || AVAIL.available;
    const current = activeInProgressTrip;
    return (
      <div className="space-y-4">
        {/* Greeting + Availability */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1 text-white/80 text-xs">
              {greeting.icon}<span>{greeting.text}</span>
            </div>
            <h2 className="text-lg font-bold">{profile?.full_name || session?.user?.name || 'Driver'}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-white/80">
              <span>{profile?.driver_number}</span>
              <span>•</span>
              <span>{profile?.license_type}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${availStyle.bg} ${availStyle.text}`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1" />
                {availStyle.label}
              </span>
              {profile?.assigned_vehicle && (
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Truck className="w-3 h-3" />{profile.assigned_vehicle.license_plate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total',   value: summary?.today?.total || 0,       color: 'text-gray-700',  bg: 'bg-gray-50'   },
            { label: 'Rencana', value: summary?.today?.scheduled || 0,   color: 'text-yellow-700',bg: 'bg-yellow-50' },
            { label: 'Aktif',   value: summary?.today?.in_progress || 0, color: 'text-blue-700',  bg: 'bg-blue-50'   },
            { label: 'Selesai', value: summary?.today?.completed || 0,   color: 'text-green-700', bg: 'bg-green-50'  },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active / next trip */}
        {current ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-blue-600 uppercase">Trip Aktif</span>
              </div>
              <span className="text-[10px] text-gray-400">Mulai {fmtTime(current.actual_start_time || undefined)}</span>
            </div>
            <p className="font-semibold text-gray-900">{current.route_name || 'Rute'}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Route className="w-3 h-3" />{current.start_location} → {current.end_location}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-3">
                {current.route_distance_km && <span className="flex items-center gap-1 text-gray-500"><MapPin className="w-3.5 h-3.5" />{current.route_distance_km} km</span>}
                {current.estimated_duration_minutes && <span className="flex items-center gap-1 text-gray-500"><Clock className="w-3.5 h-3.5" />{Math.round(current.estimated_duration_minutes / 60)} jam</span>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button onClick={() => setActiveTab('map')} className="flex items-center justify-center gap-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold active:scale-95">
                <MapPin className="w-3.5 h-3.5" />Peta
              </button>
              <button onClick={() => { setActiveTrip(current); setModal('pause-trip'); }} className="flex items-center justify-center gap-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-semibold active:scale-95">
                <Pause className="w-3.5 h-3.5" />Jeda
              </button>
              <button
                onClick={() => { setActiveTrip(current); setTripForm({ odometer: '', distance_km: String(current.route_distance_km || ''), fuel_liters: '', notes: '' }); setModal('complete-trip'); }}
                className="flex items-center justify-center gap-1 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold active:scale-95"
              >
                <CheckCircle className="w-3.5 h-3.5" />Selesai
              </button>
            </div>
          </div>
        ) : (
          todayTrips.filter(t => t.status === 'scheduled').slice(0, 1).map((t) => (
            <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600 uppercase">Trip Berikutnya</span>
                <span className="text-[10px] text-gray-400">{t.scheduled_start_time || '-'}</span>
              </div>
              <p className="font-semibold text-gray-900">{t.route_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.start_location} → {t.end_location}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => promptStartTrip(t)}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                >
                  <Play className="w-4 h-4" /> Mulai Trip
                </button>
                <button
                  onClick={() => openInGoogleMapsSearch(t.end_location || t.route_name || '')}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                >
                  <Navigation className="w-4 h-4 text-blue-500" /> Navigasi
                </button>
              </div>
            </div>
          ))
        )}
        {todayTrips.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <Route className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Belum ada trip hari ini</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {/* 8 actions → 2 baris */}
          {[
            { label: 'Inspeksi',   icon: Shield,        color: 'from-emerald-500 to-teal-600',    onClick: () => openInspectionModal() },
            { label: 'Peta',       icon: MapPin,        color: 'from-sky-500 to-blue-600',        onClick: () => setActiveTab('map') },
            { label: 'BBM',        icon: Fuel,          color: 'from-amber-500 to-orange-600',    onClick: () => setModal('fuel') },
            { label: 'POD',        icon: Package,       color: 'from-purple-500 to-violet-600',   onClick: () => openPodModal() },
            { label: 'Expense',    icon: Wallet,        color: 'from-pink-500 to-rose-600',       onClick: () => setModal('expense') },
            { label: 'Insiden',    icon: AlertTriangle, color: 'from-rose-500 to-red-600',        onClick: () => setModal('incident') },
            { label: 'Servis',     icon: Wrench,        color: 'from-gray-500 to-gray-700',       onClick: () => setActiveTab('vehicle') },
            { label: 'Navigasi',   icon: Navigation,    color: 'from-indigo-500 to-blue-700',     onClick: () => {
              const t = activeInProgressTrip || todayTrips[0];
              if (t?.end_location) openInGoogleMapsSearch(t.end_location);
              else toast('Pilih trip dulu untuk navigasi', { icon: 'ℹ️' });
            } },
          ].map((a) => (
            <button key={a.label} onClick={a.onClick} className={`rounded-2xl p-3 bg-gradient-to-br ${a.color} text-white active:scale-95 shadow-sm flex flex-col items-center gap-1`}>
              <a.icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Attendance card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" />Absensi Hari Ini</h3>
            <span className="text-[10px] text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-green-600">Masuk</p>
              <p className="text-lg font-bold text-green-700">{hr?.today?.check_in?.substring(0,5) || summary?.attendance?.check_in?.substring(0,5) || '-'}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-orange-600">Pulang</p>
              <p className="text-lg font-bold text-orange-700">{hr?.today?.check_out?.substring(0,5) || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleClockIn} disabled={!!hr?.today?.check_in} className="flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold disabled:opacity-40 active:scale-95">
              <Navigation className="w-3.5 h-3.5" /> Clock-in
            </button>
            <button onClick={handleClockOut} disabled={!hr?.today?.check_in || !!hr?.today?.check_out} className="flex items-center justify-center gap-1.5 bg-orange-500 text-white py-2 rounded-lg text-xs font-semibold disabled:opacity-40 active:scale-95">
              <Square className="w-3.5 h-3.5" /> Clock-out
            </button>
          </div>
        </div>

        {/* Performance snapshot */}
        {performance && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />Performa Bulan Ini</h3>
              <span className="text-[11px] font-bold text-blue-600">Skor {performance.overallScore}</span>
            </div>
            <div className="space-y-2.5">
              {(performance.metrics || []).slice(0,3).map((m: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 flex items-center gap-1">
                      {m.trend === 'up' ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                      {m.name}
                    </span>
                    <span className="font-semibold">{Number(m.actual).toFixed(1)}{m.unit}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${m.actual >= m.target ? 'bg-green-500' : m.actual >= m.target * 0.8 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min((Number(m.actual) / Number(m.target || 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  TAB: TRIPS
  // ═══════════════════════════════════════════════════════════════════════
  const renderTrips = () => {
    const monthLabel = new Date(`${tripMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const prev = () => { const d = new Date(`${tripMonth}-01`); d.setMonth(d.getMonth() - 1); setTripMonth(d.toISOString().slice(0,7)); };
    const next = () => { const d = new Date(`${tripMonth}-01`); d.setMonth(d.getMonth() + 1); if (d <= new Date()) setTripMonth(d.toISOString().slice(0,7)); };
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95"><ChevronRight className="w-4 h-4 text-gray-600 rotate-180" /></button>
          <p className="font-semibold text-sm capitalize">{monthLabel}</p>
          <button onClick={next} disabled={tripMonth === new Date().toISOString().slice(0,7)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 active:scale-95"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/80 uppercase">Total Jarak Bulan Ini</p>
              <p className="text-3xl font-bold mt-0.5">{Math.round(tripsRecap?.distance_km || 0)}<span className="text-lg font-normal"> km</span></p>
              <p className="text-[10px] text-white/70 mt-1">{tripsRecap?.fuel_liters || 0} L BBM digunakan</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/80">Trip Selesai</p>
              <p className="text-2xl font-bold">{tripsRecap?.completed || 0}<span className="text-sm font-normal"> / {tripsRecap?.total || 0}</span></p>
              <p className="text-[10px] text-white/70">Tepat Waktu {tripsRecap?.on_time_rate || 0}%</p>
            </div>
          </div>
        </div>

        {/* Today tab-in-tab: active trips */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-900">Trip Hari Ini</h3>
            <button onClick={() => fetchAll()} className="p-1 text-gray-400"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
          {todayTrips.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Tidak ada trip hari ini</p>
          ) : (
            <div className="space-y-2">
              {todayTrips.map(renderTripCard)}
            </div>
          )}
        </div>

        {/* Monthly history */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Riwayat {monthLabel}</h3>
          {trips.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Tidak ada riwayat</p>
          ) : (
            <div className="space-y-2">
              {trips.map(renderTripCard)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTripCard = (t: Trip) => {
    const s = TRIP_STATUS[t.status] || TRIP_STATUS.scheduled;
    return (
      <div key={t.id} className="p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
            <span className="text-xs text-gray-500 truncate">{t.route_number}</span>
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{t.scheduled_start_time || fmtTime(t.actual_start_time)}</span>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{t.route_name}</p>
        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
          <Route className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{t.start_location} → {t.end_location}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 text-gray-500">
            {t.license_plate && <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" />{t.license_plate}</span>}
            {t.total_distance_km != null && <span>{Number(t.total_distance_km).toFixed(1)} km</span>}
            {t.fuel_consumed_liters != null && <span>{Number(t.fuel_consumed_liters).toFixed(1)} L</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openInGoogleMapsSearch(t.end_location || t.route_name || '')}
              className="text-gray-500 hover:text-blue-600 text-[11px] flex items-center gap-0.5"
              title="Buka di Google Maps"
            ><Navigation className="w-3 h-3" />Arah</button>
            {t.status === 'scheduled' && (
              <button
                onClick={() => promptStartTrip(t)}
                className="text-blue-600 font-semibold text-[11px]"
              >Mulai</button>
            )}
            {t.status === 'in_progress' && (
              <>
                <button
                  onClick={() => { setActiveTrip(t); openPodModal(t.id); }}
                  className="text-purple-600 font-semibold text-[11px]"
                >POD</button>
                <button
                  onClick={() => { setActiveTrip(t); setTripForm({ odometer: '', distance_km: String(t.route_distance_km || ''), fuel_liters: '', notes: '' }); setModal('complete-trip'); }}
                  className="text-green-600 font-semibold text-[11px]"
                >Selesaikan</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  TAB: MAP
  // ═══════════════════════════════════════════════════════════════════════
  const renderMap = () => {
    const current = activeInProgressTrip;
    const latest = gps?.latest || null;
    const trail  = Array.isArray(gps?.points) ? [...gps.points].reverse() : [];

    let start: { name: string; lat: number; lng: number } | null = null;
    let end:   { name: string; lat: number; lng: number } | null = null;
    if (current?.stops && Array.isArray(current.stops) && current.stops.length) {
      const first = current.stops[0];
      const last = current.stops[current.stops.length - 1];
      if (typeof first?.lat === 'number' && typeof first?.lng === 'number') start = { name: current.start_location || 'Start', lat: first.lat, lng: first.lng };
      if (typeof last?.lat === 'number' && typeof last?.lng === 'number' && last !== first) end = { name: current.end_location || 'End', lat: last.lat, lng: last.lng };
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-[420px] relative">
            <DriverMap
              current={latest}
              trail={trail}
              stops={(current?.stops && Array.isArray(current.stops) ? current.stops : []).map((s: any) => ({ name: s.name || 'Stop', lat: s.lat, lng: s.lng, address: s.address }))}
              startLocation={start}
              endLocation={end}
              height="100%"
              autoFit
            />
          </div>
        </div>

        {latest && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <Gauge className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{Math.round(latest.speed_kmh || 0)}</p>
              <p className="text-[10px] text-gray-400">km/jam</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <Navigation className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{Math.round(latest.heading || 0)}°</p>
              <p className="text-[10px] text-gray-400">arah</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{gps?.count || 0}</p>
              <p className="text-[10px] text-gray-400">ping GPS</p>
            </div>
          </div>
        )}

        {current && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-blue-600 uppercase">Rute Aktif</span>
            </div>
            <p className="font-semibold text-gray-900">{current.route_name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Route className="w-3 h-3" />{current.start_location} → {current.end_location}</p>
            {Array.isArray(current.stops) && current.stops.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-600">Pemberhentian ({current.stops.length})</p>
                {current.stops.map((s: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-gray-800 truncate">{s.name || 'Stop'}</p>
                      {s.address && <p className="text-[10px] text-gray-400 truncate">{s.address}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!current && todayTrips.filter(t => t.status === 'scheduled').slice(0,1).map(t => (
          <div key={t.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
            Trip berikutnya: <b>{t.route_name}</b> dijadwalkan {t.scheduled_start_time || '-'}
          </div>
        ))}

        <div className="flex gap-2">
          <button onClick={() => setModal('incident')} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white py-2.5 rounded-xl text-xs font-semibold active:scale-95 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" /> Lapor Insiden
          </button>
          <button onClick={fetchAll} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 active:scale-95 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  TAB: VEHICLE
  // ═══════════════════════════════════════════════════════════════════════
  const renderVehicle = () => {
    if (!vehicle) return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
        <Truck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Belum ada kendaraan ter-assign</p>
      </div>
    );

    const expiryBadge = (days: number | null, label: string) => {
      if (days === null) return null;
      const color = days < 30 ? 'bg-red-100 text-red-700' : days < 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
      return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
          {label}: {days < 0 ? 'EXPIRED' : `${days} hari lagi`}
        </span>
      );
    };

    return (
      <div className="space-y-4">
        {/* Vehicle hero */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-wider">{vehicle.license_plate}</p>
                <p className="text-xs text-white/70">{vehicle.vehicle_number}</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-400/20 text-green-200 uppercase font-semibold">{vehicle.status}</span>
          </div>
          <p className="text-sm text-white/90 mt-2">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
            <div>
              <p className="text-[10px] text-white/60">Odometer</p>
              <p className="text-sm font-bold">{Number(vehicle.current_odometer_km || 0).toLocaleString('id-ID')} km</p>
            </div>
            <div>
              <p className="text-[10px] text-white/60">Beban Max</p>
              <p className="text-sm font-bold">{Number(vehicle.max_weight_kg || 0).toLocaleString('id-ID')} kg</p>
            </div>
            <div>
              <p className="text-[10px] text-white/60">BBM</p>
              <p className="text-sm font-bold capitalize">{vehicle.fuel_type || 'diesel'}</p>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" />Dokumen Kendaraan</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">STNK</p>
                <p className="text-sm font-medium text-gray-800">{vehicle.registration_number || '-'}</p>
                <p className="text-[10px] text-gray-400">Expired: {fmtDate(vehicle.registration_expiry)}</p>
              </div>
              {expiryBadge(vehicle.registration_days_left ?? null, 'STNK')}
            </div>
            <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Asuransi</p>
                <p className="text-sm font-medium text-gray-800">{vehicle.insurance_provider || '-'}</p>
                <p className="text-[10px] text-gray-400">{vehicle.insurance_policy_number} · Expired: {fmtDate(vehicle.insurance_expiry)}</p>
              </div>
              {expiryBadge(vehicle.insurance_days_left ?? null, 'ASR')}
            </div>
            {vehicle.ownership_document && (
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">BPKB</p>
                  <p className="text-sm font-medium text-gray-800">{vehicle.ownership_document}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fuel log */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Fuel className="w-4 h-4 text-amber-500" />Log BBM 30 Hari</h3>
            <button onClick={() => setModal('fuel')} className="text-xs text-amber-600 font-semibold flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Catat
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-amber-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-amber-600">Total Liter</p>
              <p className="text-lg font-bold text-amber-700">{Number(fuelLog.total_liters || 0).toFixed(1)} L</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-orange-600">Total Biaya</p>
              <p className="text-lg font-bold text-orange-700">{fmtCur(fuelLog.total_cost || 0)}</p>
            </div>
          </div>
          {fuelLog.records.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Belum ada catatan BBM</p>
          ) : (
            <div className="space-y-1.5">
              {fuelLog.records.slice(0, 8).map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Fuel className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{r.fuel_station || 'SPBU'}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(r.transaction_date)} · {Number(r.quantity_liters).toFixed(1)}L @{fmtCur(r.price_per_liter)}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-800">{fmtCur(r.total_cost)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-gray-500" />Jadwal Servis</h3>
          {maintenance.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Tidak ada jadwal servis</p>
          ) : (
            <div className="space-y-2">
              {maintenance.map((m) => {
                const due = m.next_service_date ? Math.ceil((new Date(m.next_service_date).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={m.id} className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800 capitalize">{String(m.maintenance_type).replace(/_/g, ' ')}</p>
                      {due !== null && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${due < 0 ? 'bg-red-100 text-red-700' : due < 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {due < 0 ? `Terlambat ${-due}h` : `${due}h lagi`}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Terakhir: {fmtDate(m.last_service_date)} · Berikutnya: {fmtDate(m.next_service_date)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  TAB: HR
  // ═══════════════════════════════════════════════════════════════════════
  const renderHr = () => {
    const m = hr?.month || { present: 0, late: 0, absent: 0, leave: 0, wfh: 0 };
    const total = (m.present || 0) + (m.late || 0) + (m.absent || 0) + (m.leave || 0) + (m.wfh || 0);
    const rate = total ? Math.round(((m.present + m.late + m.wfh) / total) * 100) : 0;
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-emerald-100 uppercase">Tingkat Kehadiran</p>
              <p className="text-4xl font-bold mt-0.5">{rate}<span className="text-xl">%</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-emerald-100">Hari Kerja Bulan Ini</p>
              <p className="text-2xl font-bold">{(m.present || 0) + (m.late || 0) + (m.wfh || 0)}<span className="text-sm font-normal"> / {total}</span></p>
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${rate}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[
            { key: 'present', label: 'Hadir',     val: m.present, color: 'bg-green-50 text-green-700' },
            { key: 'late',    label: 'Terlambat', val: m.late,    color: 'bg-yellow-50 text-yellow-700' },
            { key: 'leave',   label: 'Cuti',      val: m.leave,   color: 'bg-blue-50 text-blue-700' },
            { key: 'wfh',     label: 'WFH',       val: m.wfh,     color: 'bg-purple-50 text-purple-700' },
            { key: 'absent',  label: 'Absen',     val: m.absent,  color: 'bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.key} className={`${s.color} rounded-xl p-2 text-center`}>
              <p className="text-lg font-bold">{s.val || 0}</p>
              <p className="text-[9px] font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm mb-3">Absensi Hari Ini</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-green-600">Clock-in</p>
              <p className="text-lg font-bold text-green-700">{hr?.today?.check_in?.substring(0,5) || '-'}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-orange-600">Clock-out</p>
              <p className="text-lg font-bold text-orange-700">{hr?.today?.check_out?.substring(0,5) || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleClockIn} disabled={!!hr?.today?.check_in} className="flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-lg text-xs font-semibold disabled:opacity-40 active:scale-95">
              <Navigation className="w-3.5 h-3.5" /> Clock-in
            </button>
            <button onClick={handleClockOut} disabled={!hr?.today?.check_in || !!hr?.today?.check_out} className="flex items-center justify-center gap-1.5 bg-orange-500 text-white py-2.5 rounded-lg text-xs font-semibold disabled:opacity-40 active:scale-95">
              <Square className="w-3.5 h-3.5" /> Clock-out
            </button>
          </div>
        </div>

        {/* Shift & payroll summary */}
        {shiftSummary && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" /> Jam Kerja & Trip (Bulan Ini)
              </h3>
              <span className="text-[10px] text-gray-400">{shiftSummary.month}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-indigo-500 uppercase">Jam Kerja</p>
                <p className="text-base font-bold text-indigo-700">{shiftSummary.total_hours}</p>
                <p className="text-[9px] text-gray-500">jam</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-amber-600 uppercase">Lembur</p>
                <p className="text-base font-bold text-amber-700">{shiftSummary.overtime_hours}</p>
                <p className="text-[9px] text-gray-500">jam</p>
              </div>
              <div className="bg-green-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-green-600 uppercase">Rata-rata</p>
                <p className="text-base font-bold text-green-700">{shiftSummary.avg_hours_per_day}</p>
                <p className="text-[9px] text-gray-500">jam/hari</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase">Trip</p>
                <p className="text-base font-bold text-gray-900">{shiftSummary.trips?.trips_completed || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase">Jarak</p>
                <p className="text-base font-bold text-gray-900">{Math.round(Number(shiftSummary.trips?.distance_km || 0))} km</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase">POD</p>
                <p className="text-base font-bold text-gray-900">{shiftSummary.pod_count || 0}</p>
              </div>
            </div>
            {(shiftSummary.expense?.pending_amount > 0 || shiftSummary.expense?.approved_amount > 0) && (
              <div className="bg-pink-50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="text-pink-700 font-semibold">Reimburse / Klaim</p>
                  <p className="text-[10px] text-pink-600">
                    Disetujui {fmtCur(shiftSummary.expense?.approved_amount || 0)} · Pending {fmtCur(shiftSummary.expense?.pending_amount || 0)}
                  </p>
                </div>
                <Wallet className="w-5 h-5 text-pink-500" />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link href="/employee" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95">
            <CalendarDays className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-sm font-semibold text-gray-800">Portal Cuti</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{hr?.pendingLeave || 0} menunggu</p>
          </Link>
          <Link href="/employee" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95">
            <Wallet className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-sm font-semibold text-gray-800">Klaim</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{hr?.pendingClaims || 0} menunggu</p>
          </Link>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  TAB: PROFILE
  // ═══════════════════════════════════════════════════════════════════════
  const renderProfile = () => {
    if (!profile) return null;
    const licDays = profile.license_expiry_date ? Math.ceil((new Date(profile.license_expiry_date).getTime() - Date.now()) / 86400000) : null;
    const licBadge = licDays === null ? null : licDays < 30 ? 'bg-red-100 text-red-700' : licDays < 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3">
            {profile.photo_url ? <img src={profile.photo_url} alt="" className="w-20 h-20 rounded-full object-cover" /> : <User className="w-10 h-10 text-white" />}
          </div>
          <h3 className="text-lg font-bold text-gray-900">{profile.full_name}</h3>
          <p className="text-sm text-gray-500">{profile.driver_number}</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs">
            <span className="flex items-center gap-1 text-amber-500"><Star className="w-3 h-3 fill-amber-500" />{Number(profile.customer_rating || 0).toFixed(1)}</span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-green-600"><Shield className="w-3 h-3" />{Number(profile.safety_score || 0).toFixed(1)}</span>
          </div>
        </div>

        {/* Career stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />Statistik Karier</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <Package className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-base font-bold text-blue-700">{profile.total_deliveries}</p>
              <p className="text-[10px] text-gray-500">Pengiriman</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-base font-bold text-green-700">{profile.total_deliveries > 0 ? Math.round((profile.on_time_deliveries / profile.total_deliveries) * 100) : 0}%</p>
              <p className="text-[10px] text-gray-500">Tepat Waktu</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <Route className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-base font-bold text-purple-700">{Math.round(profile.total_distance_km).toLocaleString('id-ID')}</p>
              <p className="text-[10px] text-gray-500">km</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-sm mb-3">Informasi Pribadi</h3>
          <div className="space-y-3">
            {[
              { icon: Phone,       label: 'Telepon',      value: profile.phone },
              { icon: Building2,   label: 'Cabang',       value: profile.branch_name || '-' },
              { icon: Briefcase,   label: 'Email',        value: profile.email },
              { icon: Clock,       label: 'Bergabung',    value: fmtDate(profile.hire_date) },
              { icon: Flag,        label: 'Tipe Kerja',   value: (profile.employment_type || '-').replace(/_/g, ' ') },
            ].map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <it.icon className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">{it.label}</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{it.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* License */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" />SIM</h3>
            {licBadge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${licBadge}`}>
                {licDays! < 0 ? 'EXPIRED' : `${licDays} hari lagi`}
              </span>
            )}
          </div>
          <div className="text-sm space-y-1">
            <p className="flex justify-between"><span className="text-gray-500">Nomor</span><span className="font-medium">{profile.license_number}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Jenis</span><span className="font-medium">{profile.license_type}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Expired</span><span className="font-medium">{fmtDate(profile.license_expiry_date)}</span></p>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-2">
          <Link href="/hq/fleet-management" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3"><Truck className="w-5 h-5 text-gray-500" /><span className="text-sm font-medium text-gray-700">Fleet Management (HQ)</span></div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link href="/employee" className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3"><User className="w-5 h-5 text-gray-500" /><span className="text-sm font-medium text-gray-700">Portal Karyawan</span></div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/auth/login' })} className="w-full flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-red-100">
            <div className="flex items-center gap-3"><LogOut className="w-5 h-5 text-red-500" /><span className="text-sm font-medium text-red-600">Keluar</span></div>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  MODALS
  // ═══════════════════════════════════════════════════════════════════════
  const renderModal = () => {
    if (!modal) return null;

    const wrapper = (children: React.ReactNode, title: string, accent = 'blue') => (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={() => setModal(null)} />
        <div className="relative bg-white w-full max-w-lg rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl z-10">
            <h3 className="font-bold text-gray-900">{title}</h3>
            <button onClick={() => setModal(null)} className="p-1.5 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="p-4 space-y-3">{children}</div>
        </div>
      </div>
    );

    if (modal === 'start-trip' && activeTrip) return wrapper(
      <>
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="font-semibold text-sm">{activeTrip.route_name}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Route className="w-3 h-3" />{activeTrip.start_location} → {activeTrip.end_location}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Odometer Awal (km)</label>
          <input type="number" value={tripForm.odometer} onChange={e => setTripForm(f => ({ ...f, odometer: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1" placeholder="Contoh: 45230" />
        </div>
        <p className="text-[11px] text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />Lokasi GPS Anda akan dicatat sebagai titik awal trip.</p>
        <button onClick={handleStartTrip} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting || gpsLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Memulai...</> : <><Play className="w-4 h-4" />Mulai Trip</>}
        </button>
      </>,
      'Mulai Trip'
    );

    if (modal === 'complete-trip' && activeTrip) return wrapper(
      <>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="font-semibold text-sm">{activeTrip.route_name}</p>
          <p className="text-xs text-gray-500">Mulai: {fmtTime(activeTrip.actual_start_time || undefined)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Odometer Akhir</label>
            <input type="number" value={tripForm.odometer} onChange={e => setTripForm(f => ({ ...f, odometer: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Jarak (km)</label>
            <input type="number" step="0.1" value={tripForm.distance_km} onChange={e => setTripForm(f => ({ ...f, distance_km: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">BBM Terpakai (liter)</label>
          <input type="number" step="0.1" value={tripForm.fuel_liters} onChange={e => setTripForm(f => ({ ...f, fuel_liters: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Catatan</label>
          <textarea value={tripForm.notes} onChange={e => setTripForm(f => ({ ...f, notes: e.target.value }))} rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1 resize-none" />
        </div>
        <button onClick={handleCompleteTrip} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting || gpsLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><CheckCircle className="w-4 h-4" />Selesaikan Trip</>}
        </button>
      </>,
      'Selesaikan Trip'
    );

    if (modal === 'pause-trip' && activeTrip) return wrapper(
      <>
        <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">Catat istirahat di tengah trip. Trip tidak akan diselesaikan.</div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Alasan</label>
          <textarea value={pauseReason} onChange={e => setPauseReason(e.target.value)} rows={2} placeholder="Contoh: Istirahat makan siang"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1 resize-none" />
        </div>
        <button onClick={handlePauseTrip} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
          Simpan Istirahat
        </button>
      </>,
      'Istirahat / Jeda'
    );

    if (modal === 'fuel') return wrapper(
      <>
        <div>
          <label className="text-xs font-semibold text-gray-700">Nama SPBU / Stasiun</label>
          <input type="text" value={fuelForm.fuel_station} onChange={e => setFuelForm(f => ({ ...f, fuel_station: e.target.value }))}
            placeholder="Pertamina / Shell / BP" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Jenis BBM</label>
            <select value={fuelForm.fuel_type} onChange={e => setFuelForm(f => ({ ...f, fuel_type: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 bg-white">
              <option value="diesel">Solar / Diesel</option>
              <option value="petrol">Bensin</option>
              <option value="electric">Listrik</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Pembayaran</label>
            <select value={fuelForm.payment_method} onChange={e => setFuelForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 bg-white">
              <option value="fuel_card">Kartu BBM</option>
              <option value="cash">Tunai</option>
              <option value="card">Kartu Debit/Kredit</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Jumlah (Liter) <span className="text-red-500">*</span></label>
            <input type="number" step="0.1" value={fuelForm.quantity_liters} onChange={e => setFuelForm(f => ({ ...f, quantity_liters: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Harga/Liter <span className="text-red-500">*</span></label>
            <input type="number" value={fuelForm.price_per_liter} onChange={e => setFuelForm(f => ({ ...f, price_per_liter: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
        </div>
        {fuelForm.quantity_liters && fuelForm.price_per_liter && (
          <div className="bg-amber-50 rounded-xl p-2.5 flex items-center justify-between text-sm">
            <span className="text-amber-700 font-semibold">Total</span>
            <span className="text-amber-700 font-bold">{fmtCur(Number(fuelForm.quantity_liters) * Number(fuelForm.price_per_liter))}</span>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-gray-700">Odometer (km)</label>
          <input type="number" value={fuelForm.odometer_reading} onChange={e => setFuelForm(f => ({ ...f, odometer_reading: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">No. Kwitansi</label>
          <input type="text" value={fuelForm.receipt_number} onChange={e => setFuelForm(f => ({ ...f, receipt_number: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1" />
        </div>
        <button onClick={handleSubmitFuel} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Simpan BBM
        </button>
      </>,
      'Catat Pengisian BBM'
    );

    if (modal === 'inspection') return wrapper(
      <>
        <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Cek kelayakan kendaraan sebelum berangkat. Item "Perlu Perbaikan" akan dicatat sebagai temuan.</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Odometer (km)</label>
            <input type="number" value={inspectionForm.odometer}
              onChange={(e) => setInspectionForm((f) => ({ ...f, odometer: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Level BBM (%)</label>
            <input type="number" min={0} max={100} value={inspectionForm.fuel}
              onChange={(e) => setInspectionForm((f) => ({ ...f, fuel: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
        </div>
        <div className="space-y-2">
          {INSPECTION_ITEMS.map((it) => {
            const v = inspectionForm.checklist[it.key] || 'ok';
            return (
              <div key={it.key} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{it.label}</p>
                  <div className="flex bg-gray-100 rounded-full p-0.5">
                    <button onClick={() => setInspectionForm((f) => ({ ...f, checklist: { ...f.checklist, [it.key]: 'ok' } }))}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold ${v === 'ok' ? 'bg-green-500 text-white' : 'text-gray-500'}`}>OK</button>
                    <button onClick={() => setInspectionForm((f) => ({ ...f, checklist: { ...f.checklist, [it.key]: 'issue' } }))}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold ${v === 'issue' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Perlu Perbaikan</button>
                  </div>
                </div>
                {v === 'issue' && (
                  <input type="text" placeholder="Catatan temuan..."
                    value={inspectionForm.issues[it.key] || ''}
                    onChange={(e) => setInspectionForm((f) => ({ ...f, issues: { ...f.issues, [it.key]: e.target.value } }))}
                    className="w-full mt-2 border border-red-200 bg-red-50 rounded-lg px-3 py-2 text-xs" />
                )}
              </div>
            );
          })}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Catatan tambahan</label>
          <textarea value={inspectionForm.notes}
            onChange={(e) => setInspectionForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1 resize-none" />
        </div>
        <PhotoUploader
          kind="inspection"
          photos={inspPhotos}
          onChange={setInspPhotos}
          max={4}
          color="emerald"
          uploadingState={[uploadingPhoto, setUploadingPhoto]}
        />
        <button onClick={handleSubmitInspection} disabled={submitting || uploadingPhoto}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><CheckCircle className="w-4 h-4" />Simpan Inspeksi</>}
        </button>
      </>,
      'Inspeksi Pre-Trip'
    );

    if (modal === 'pod') return wrapper(
      <>
        <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-800 flex items-start gap-2">
          <Package className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Simpan bukti pengiriman: nama penerima, nomor referensi, dan tanda tangan.</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Nama Penerima <span className="text-red-500">*</span></label>
            <input type="text" value={podForm.recipient_name}
              onChange={(e) => setPodForm((f) => ({ ...f, recipient_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Posisi/Jabatan</label>
            <input type="text" value={podForm.recipient_role}
              placeholder="Admin / Security"
              onChange={(e) => setPodForm((f) => ({ ...f, recipient_role: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">No HP</label>
            <input type="tel" value={podForm.recipient_phone}
              onChange={(e) => setPodForm((f) => ({ ...f, recipient_phone: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">No Surat Jalan</label>
            <input type="text" value={podForm.reference_number}
              onChange={(e) => setPodForm((f) => ({ ...f, reference_number: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">Tanda Tangan <span className="text-red-500">*</span></label>
            <button onClick={clearSignature} className="text-[11px] text-gray-500 underline">Clear</button>
          </div>
          <div className="mt-1 border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden">
            <canvas
              ref={podSigRef}
              width={640} height={220}
              style={{ width: '100%', height: 180, touchAction: 'none' }}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Catatan</label>
          <textarea value={podForm.notes}
            onChange={(e) => setPodForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1 resize-none" />
        </div>
        <PhotoUploader
          kind="pod"
          photos={podPhotos}
          onChange={setPodPhotos}
          max={4}
          color="purple"
          uploadingState={[uploadingPhoto, setUploadingPhoto]}
        />
        <button onClick={handleSubmitPod} disabled={submitting || uploadingPhoto}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting || gpsLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : <><CheckCircle className="w-4 h-4" />Simpan Bukti Pengiriman</>}
        </button>
      </>,
      'Bukti Pengiriman (POD)'
    );

    if (modal === 'expense') return wrapper(
      <>
        <div className="bg-pink-50 rounded-xl p-3 text-xs text-pink-800 flex items-start gap-2">
          <Wallet className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Catat pengeluaran harian seperti tol, parkir, makan, atau reparasi. Akan diverifikasi oleh admin.</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Kategori <span className="text-red-500">*</span></label>
            <select value={expenseForm.category}
              onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 bg-white">
              <option value="toll">Tol</option>
              <option value="parking">Parkir</option>
              <option value="meal">Makan</option>
              <option value="lodging">Penginapan</option>
              <option value="repair">Reparasi</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Jumlah (Rp) <span className="text-red-500">*</span></label>
            <input type="number" min={0} value={expenseForm.amount}
              onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Deskripsi</label>
          <input type="text" value={expenseForm.description}
            placeholder="Tol Cikampek-Bandung"
            onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">No. Kwitansi</label>
            <input type="text" value={expenseForm.receipt_number}
              onChange={(e) => setExpenseForm((f) => ({ ...f, receipt_number: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Pembayaran</label>
            <select value={expenseForm.payment_method}
              onChange={(e) => setExpenseForm((f) => ({ ...f, payment_method: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 bg-white">
              <option value="cash">Tunai (Reimburse)</option>
              <option value="company_card">Kartu Perusahaan</option>
              <option value="reimburse">Reimburse</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Catatan</label>
          <textarea value={expenseForm.notes} rows={2}
            onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1 resize-none" />
        </div>
        <PhotoUploader
          kind="expense"
          photos={expensePhoto ? [expensePhoto] : []}
          onChange={(urls) => setExpensePhoto(urls[0] || '')}
          max={1}
          color="pink"
          uploadingState={[uploadingPhoto, setUploadingPhoto]}
        />
        <button onClick={handleSubmitExpense} disabled={submitting || uploadingPhoto}
          className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Simpan Expense
        </button>
        {expenses?.records?.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Bulan ini · Total {fmtCur(expenses.summary?.total_amount || 0)}</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {(expenses.records || []).slice(0, 8).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-[11px] bg-gray-50 rounded-lg px-2 py-1.5">
                  <span className="font-medium">{e.category}</span>
                  <span>{fmtCur(Number(e.amount))}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    e.status === 'approved' ? 'bg-green-100 text-green-700' :
                    e.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>,
      'Catat Pengeluaran'
    );

    if (modal === 'incident') return wrapper(
      <>
        <div>
          <label className="text-xs font-semibold text-gray-700">Jenis Insiden</label>
          <select value={incidentForm.incident_type} onChange={e => setIncidentForm(f => ({ ...f, incident_type: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 bg-white">
            <option value="accident">Kecelakaan</option>
            <option value="breakdown">Mogok / Kerusakan</option>
            <option value="traffic">Kemacetan Parah</option>
            <option value="theft">Pencurian / Perampokan</option>
            <option value="weather">Cuaca Buruk</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Deskripsi <span className="text-red-500">*</span></label>
          <textarea value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))} rows={3}
            placeholder="Jelaskan detail insiden..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1 resize-none" />
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Laporan insiden akan langsung dikirim ke pusat dispatch beserta lokasi GPS Anda.</span>
        </div>
        <button onClick={handleReportIncident} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          Kirim Laporan
        </button>
      </>,
      'Lapor Insiden'
    );

    return null;
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════
  const tabs: { key: TabKey; icon: any; label: string }[] = [
    { key: 'home',    icon: Home,    label: 'Beranda'   },
    { key: 'trips',   icon: Route,   label: 'Trip'      },
    { key: 'map',     icon: MapPin,  label: 'Peta'      },
    { key: 'vehicle', icon: Truck,   label: 'Armada'    },
    { key: 'hr',      icon: User,    label: 'HR'        },
    { key: 'profile', icon: Shield,  label: 'Profil'    },
  ];

  const renderContent = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
    switch (activeTab) {
      case 'home':    return renderHome();
      case 'trips':   return renderTrips();
      case 'map':     return renderMap();
      case 'vehicle': return renderVehicle();
      case 'hr':      return renderHr();
      case 'profile': return renderProfile();
    }
  };

  return (
    <>
      <Head>
        <title>Driver Portal | BEDAGANG</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <Toaster position="top-center" toastOptions={{ duration: 2600, style: { fontSize: '14px' } }} />

      <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            {activeTab === 'home' ? 'Driver Portal' : tabs.find(t => t.key === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-1">
            {/* Online/offline + GPS queue badge */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
              title={online ? 'Online' : `Offline · ${queuedPings} ping tertahan`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
              {online ? 'Online' : 'Offline'}
              {queuedPings > 0 && <span className="ml-0.5 text-[9px] font-bold">({queuedPings})</span>}
            </span>
            <button onClick={fetchAll} className="p-2 rounded-full hover:bg-gray-100"><RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} /></button>
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
              <div className="p-3 border-b border-gray-100">
                <span className="font-semibold text-sm">Notifikasi</span>
              </div>
              {notifications.length === 0 ? <p className="p-4 text-sm text-gray-400 text-center">Tidak ada notifikasi</p> :
                notifications.map((n: any) => (
                  <div key={n.id} className={`p-3 border-b border-gray-50 ${n.read ? '' : 'bg-blue-50/40'}`}>
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

// Briefcase icon not imported above; re-exported here if needed elsewhere
const Briefcase = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
