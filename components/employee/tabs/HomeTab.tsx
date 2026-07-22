import {
  Fingerprint, Loader2, Camera, Sunrise, Moon, Navigation, ExternalLink,
  Shield, Building2, Megaphone, Bell, Calendar, Wallet, Target, Receipt,
  FileText, Clock, Award, Users, Plane, CheckCircle, XCircle, Plus, Timer,
} from 'lucide-react';
import {
  Card, SectionHeader, StatusBadge, GeofenceBadge,
  EnterpriseHero, QuickAction, StatTile,
} from '@/components/employee/portal-ui';

export interface HomeTabProps {
  greeting: string;
  userName: string;
  userPosition: string;
  userBranch: string;
  userDept: string;
  todayAttendance: any;
  canClockIn: boolean;
  canClockOut: boolean;
  clocking: 'in' | 'out' | null;
  handleClockIn: (...args: any[]) => any;
  handleClockOut: (...args: any[]) => any;
  setClockPhoto: (...args: any[]) => any;
  setClockPhotoModal: (...args: any[]) => any;
  monthAttendance: any;
  lastClockEvent: any;
  lastCheckIn: any;
  lastCheckOut: any;
  isManagerPortal: boolean;
  managerPendingCount: number;
  goToTab: (...args: any[]) => any;
  isMfAgent: boolean;
  mfOverview: any;
  unreadCount: number;
  openNotifications: (...args: any[]) => any;
  announcements: any;
  notifications: any;
  kpiScore: number;
  kpiMetrics: any;
  setModal: (...args: any[]) => any;
  leaveBalance: any[];
  pendingLeaves: any[];
  pendingClaims: any[];
  pendingTravel: any[];
  setOtModal: (...args: any[]) => any;
}


const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtAttTime = (val?: string | null) => {
  if (!val) return '--:--';
  if (/^\d{2}:\d{2}/.test(val)) return val.substring(0, 5);
  const d = new Date(val);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};
const getInitials = (name: string) =>
  (name || 'K').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

const CLAIM_TYPE_LABELS: Record<string, string> = {
  medical: 'Medis', transport: 'Transport', meals: 'Makan', accommodation: 'Akomodasi',
  communication: 'Komunikasi', other: 'Lainnya',
};
const claimTypeLabel = (v: string) => CLAIM_TYPE_LABELS[v] || v;

export default function HomeTab({
  greeting, userName, userPosition, userBranch, userDept, todayAttendance, canClockIn, canClockOut, clocking, handleClockIn, handleClockOut, setClockPhoto, setClockPhotoModal, monthAttendance, lastClockEvent, lastCheckIn, lastCheckOut, isManagerPortal, managerPendingCount, goToTab, isMfAgent, mfOverview, unreadCount, openNotifications, announcements, notifications, kpiScore, kpiMetrics, setModal,
  leaveBalance = [], pendingLeaves = [], pendingClaims = [], pendingTravel = [], setOtModal,
}: HomeTabProps) {
  return (
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
        <Card className="p-4 ring-2 ring-teal-100/80">
          <SectionHeader
            title="Panel Manajer"
            action={managerPendingCount > 0 ? (
              <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                {managerPendingCount} pending
              </span>
            ) : undefined}
          />
          <p className="text-xs text-slate-500 mb-3">Persetujuan cuti, klaim, lembur & surat peringatan tim Anda</p>
          <button onClick={() => goToTab('manager')}
            className="w-full py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98]">
            <Shield className="w-4 h-4" /> Buka Panel Manajer
          </button>
        </Card>
      )}

      {isMfAgent && (
        <Card className="p-4 ring-2 ring-slate-200/80">
          <SectionHeader
            title="Pembiayaan — Kinerja Hari Ini"
            action={<button onClick={() => goToTab('mf')} className="text-xs font-semibold text-teal-700">Detail →</button>}
          />
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-medium">Koleksi Hari Ini</p>
              <p className="text-lg font-bold text-emerald-800">{fmtCur(mfOverview?.todayCollection || 0)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p className="text-[10px] text-slate-600 font-medium">Aktivitas</p>
              <p className="text-lg font-bold text-slate-800">{mfOverview?.todayActivities || 0} kunjungan</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tunggakan: <b className="text-amber-600">{mfOverview?.portfolioOverdue || 0}</b></span>
            <span>NPL: <b className="text-red-600">{mfOverview?.portfolioNpl || 0}</b></span>
            <span>Komisi pending: <b className="text-teal-700">{fmtCur(mfOverview?.pendingCommission || 0)}</b></span>
          </div>
          <button onClick={() => goToTab('mf')}
            className="w-full mt-3 py-2.5 bg-teal-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98]">
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
                    ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-100'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    a.priority === 'high' ? 'bg-rose-100' : 'bg-teal-100'
                  }`}>
                    <Megaphone className={`w-4 h-4 ${a.priority === 'high' ? 'text-rose-600' : 'text-teal-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                      {a.is_pinned && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded flex-shrink-0">Pin</span>
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
            { icon: Building2, label: 'Lapangan', gradient: 'from-slate-600 to-teal-700', action: () => goToTab('mf') },
            { icon: Calendar, label: 'Cuti', gradient: 'from-teal-600 to-emerald-700', action: () => setModal('leave') },
            { icon: Navigation, label: 'Kunjungan', gradient: 'from-cyan-600 to-slate-700', action: () => goToTab('visit') },
            { icon: Target, label: 'KPI', gradient: 'from-emerald-600 to-teal-800', action: () => goToTab('kpi') },
          ] : [
            { icon: Calendar, label: 'Cuti', gradient: 'from-teal-600 to-emerald-700', action: () => setModal('leave') },
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
                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0"><Plane className="w-4 h-4 text-teal-600" /></div>
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
}
