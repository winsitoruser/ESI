import { X, MapPin, Clock, Navigation, Image, ExternalLink, CheckCircle } from 'lucide-react';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const fmtTime = (d: string | null) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_LABEL: Record<string, string> = {
  planned: 'Direncanakan', checked_in: 'Dalam Kunjungan', completed: 'Selesai',
  cancelled: 'Dibatalkan', no_contact: 'Tidak Bertemu',
};

const OUTCOME_LABEL: Record<string, string> = {
  order_taken: 'Pesanan Diambil', follow_up: 'Perlu Follow-up',
  no_contact: 'Tidak Bertemu', rejected: 'Ditolak', other: 'Lainnya',
};

function GeofenceTag({ name, status, distance }: { name?: string | null; status?: string | null; distance?: number | null }) {
  if (!name && !status) return null;
  const inside = status === 'inside';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
      inside ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}>
      <MapPin className="w-3 h-3" />
      {inside ? `Dalam · ${name}` : name ? `Luar ${distance ?? '?'}m · ${name}` : status}
    </span>
  );
}

type VisitDetail = {
  id: string;
  visit_number?: string;
  employee_name?: string;
  customer_name: string;
  customer_address?: string;
  visit_type?: string;
  purpose?: string;
  status: string;
  visit_date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  duration_minutes?: number;
  outcome?: string | null;
  outcome_notes?: string | null;
  order_taken?: boolean;
  order_value?: number;
  check_in_geofence_name?: string | null;
  check_in_geofence_status?: string | null;
  check_in_geofence_distance_m?: number | null;
  check_out_geofence_name?: string | null;
  check_out_geofence_status?: string | null;
  check_in_address?: string | null;
  check_out_address?: string | null;
  evidence_photos?: Array<{ url: string; caption?: string; type?: string }>;
  maps_url?: string | null;
};

type Props = {
  visit: VisitDetail | null;
  loading?: boolean;
  onClose: () => void;
};

export default function VisitDetailModal({ visit, loading, onClose }: Props) {
  if (!visit && !loading) return null;

  const photos = visit?.evidence_photos || [];

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">Detail Kunjungan</h3>
            {visit?.visit_number && <p className="text-[11px] text-slate-500">{visit.visit_number}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Memuat detail...</div>
          ) : visit && (
            <>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="font-semibold text-slate-900">{visit.customer_name}</p>
                {visit.employee_name && (
                  <p className="text-xs text-slate-600 mt-1">Sales: <strong>{visit.employee_name}</strong></p>
                )}
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {visit.check_in_address || visit.customer_address || 'Alamat tidak tercatat'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-blue-700 ring-1 ring-blue-200">
                    {STATUS_LABEL[visit.status] || visit.status}
                  </span>
                  <span className="text-[10px] text-slate-500">{fmtDate(visit.visit_date)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-500 flex items-center gap-1"><Navigation className="w-3 h-3" />Check-in</p>
                  <p className="font-bold text-slate-800 mt-1">{fmtTime(visit.check_in_time || null)}</p>
                  <GeofenceTag name={visit.check_in_geofence_name} status={visit.check_in_geofence_status} distance={visit.check_in_geofence_distance_m} />
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Check-out</p>
                  <p className="font-bold text-slate-800 mt-1">{fmtTime(visit.check_out_time || null)}</p>
                  <GeofenceTag name={visit.check_out_geofence_name} status={visit.check_out_geofence_status} />
                </div>
              </div>

              {(visit.duration_minutes ?? 0) > 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Durasi: <strong>{Math.round(visit.duration_minutes!)} menit</strong>
                </p>
              )}

              {visit.purpose && (
                <div className="text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Tujuan</p>
                  <p className="text-slate-600">{visit.purpose}</p>
                </div>
              )}

              {visit.outcome && (
                <div className="text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Hasil Kunjungan</p>
                  <p className="text-slate-800 font-medium">{OUTCOME_LABEL[visit.outcome] || visit.outcome}</p>
                  {visit.outcome_notes && <p className="text-slate-500 mt-1">{visit.outcome_notes}</p>}
                  {visit.order_taken && visit.order_value != null && visit.order_value > 0 && (
                    <p className="text-emerald-700 mt-1">Nilai pesanan: Rp {visit.order_value.toLocaleString('id-ID')}</p>
                  )}
                </div>
              )}

              {photos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <Image className="w-3.5 h-3.5" /> Bukti Kunjungan ({photos.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((p, i) => (
                      <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={p.url} alt={p.caption || 'Bukti'} className="w-full h-28 object-cover" loading="lazy" />
                        {p.caption && <p className="text-[10px] text-slate-500 px-2 py-1 truncate">{p.caption}</p>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {visit.maps_url && (
                <a href={visit.maps_url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-blue-600 active:scale-[0.98]">
                  <ExternalLink className="w-4 h-4" /> Buka Lokasi di Peta
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
