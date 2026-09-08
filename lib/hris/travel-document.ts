/**
 * Print / CSV / email body for a travel request detail.
 * Client-safe — no nodemailer.
 */
import { itineraryBudget, parseTravelPlan, stopBudget } from '@/lib/hris/travel-itinerary';

export type TravelDetailBundle = {
  request: Record<string, any>;
  expenses?: any[];
  totalExpenses?: number;
  employee?: { name?: string; email?: string } | null;
};

function esc(s: unknown) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtIdr(n: number) {
  return `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;
}

export function fmtDateId(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function travelCsv(detail: TravelDetailBundle): string {
  const req = detail.request || {};
  const plan = parseTravelPlan(req.itinerary, req.departure_city);
  const lines = [
    ['Nomor', req.request_number || ''],
    ['Status', req.status || ''],
    ['Rute', req.destination || ''],
    ['Keperluan', req.purpose || ''],
    ['Berangkat', req.departure_date || ''],
    ['Pulang', req.return_date || ''],
    ['Rencana', String(req.estimated_budget || itineraryBudget(plan.stops) || 0)],
    ['Aktual', String(req.actual_cost || detail.totalExpenses || 0)],
    [],
    ['Kota', 'Tiba', 'Selesai', 'Agenda', 'Komponen', 'Rencana'],
  ];
  for (const stop of plan.stops) {
    if (!(stop.costs || []).length) {
      lines.push([stop.city, stop.arriveDate, stop.departDate, stop.activity, '', String(stopBudget(stop))]);
    }
    for (const c of stop.costs || []) {
      lines.push([stop.city, stop.arriveDate, stop.departDate, stop.activity, c.label, String(c.estimated || 0)]);
    }
  }
  lines.push([]);
  lines.push(['Tanggal klaim', 'Kategori', 'Deskripsi', 'Jumlah', 'Status']);
  for (const e of detail.expenses || []) {
    lines.push([e.expense_date || '', e.category || '', e.description || '', String(e.amount || 0), e.status || '']);
  }
  const body = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  return `\uFEFF${body}`;
}

export function travelPrintHtml(detail: TravelDetailBundle): string {
  const req = detail.request || {};
  const plan = parseTravelPlan(req.itinerary, req.departure_city);
  const emp = detail.employee;
  const stopRows = plan.stops.map((stop) => {
    const costs = (stop.costs || []).map((c) => `<li>${esc(c.label)} — <strong>${fmtIdr(c.estimated)}</strong></li>`).join('');
    return `<tr>
      <td>${esc(stop.city)}</td>
      <td>${esc(fmtDateId(stop.arriveDate))} – ${esc(fmtDateId(stop.departDate))}</td>
      <td>${esc(stop.activity || '—')}</td>
      <td>${costs ? `<ul style="margin:0;padding-left:16px">${costs}</ul>` : '—'}</td>
      <td style="text-align:right">${fmtIdr(stopBudget(stop))}</td>
    </tr>`;
  }).join('');
  const expRows = (detail.expenses || []).map((e) => `<tr>
    <td>${esc(fmtDateId(e.expense_date))}</td>
    <td>${esc(e.category)}</td>
    <td>${esc(e.description)}</td>
    <td style="text-align:right">${fmtIdr(Number(e.amount))}</td>
    <td>${esc(e.status)}</td>
  </tr>`).join('') || '<tr><td colspan="5" style="color:#888;text-align:center">Belum ada klaim</td></tr>';

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"/>
    <title>${esc(req.request_number || 'Perjalanan dinas')}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111827}
      h1{font-size:20px;margin:0 0 4px}
      .meta{color:#6b7280;font-size:13px;margin-bottom:16px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
      .card{border:1px solid #e5e7eb;border-radius:8px;padding:10px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px}
      th,td{border:1px solid #e5e7eb;padding:6px 8px;vertical-align:top}
      th{background:#f9fafb;text-align:left}
      @media print{.noprint{display:none}}
    </style></head><body>
    <h1>Pengajuan perjalanan dinas</h1>
    <div class="meta">${esc(req.request_number)} · ${esc(req.status)} · ${esc(emp?.name || '')}</div>
    <p><strong>${esc(req.destination)}</strong><br/>${esc(req.purpose)}</p>
    <p class="meta">${esc(fmtDateId(req.departure_date))} – ${esc(fmtDateId(req.return_date))}</p>
    <div class="grid">
      <div class="card">Rencana<br/><strong>${fmtIdr(Number(req.estimated_budget))}</strong></div>
      <div class="card">Aktual<br/><strong>${fmtIdr(Number(req.actual_cost || 0))}</strong></div>
      <div class="card">Klaim<br/><strong>${fmtIdr(Number(detail.totalExpenses || 0))}</strong></div>
    </div>
    <h2 style="font-size:15px">Itinerary</h2>
    <table><thead><tr><th>Kota</th><th>Tanggal</th><th>Agenda</th><th>Komponen</th><th>Rencana</th></tr></thead>
    <tbody>${stopRows || '<tr><td colspan="5">Tidak ada kota</td></tr>'}</tbody></table>
    <h2 style="font-size:15px">Klaim aktual</h2>
    <table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Jumlah</th><th>Status</th></tr></thead>
    <tbody>${expRows}</tbody></table>
    <div class="noprint"><button onclick="window.print()">Cetak / simpan PDF</button></div>
    </body></html>`;
}

export function travelEmailInnerHtml(detail: TravelDetailBundle, note?: string): string {
  const req = detail.request || {};
  const plan = parseTravelPlan(req.itinerary, req.departure_city);
  const stops = plan.stops.map((s) =>
    `<li>${esc(s.city)} (${esc(fmtDateId(s.arriveDate))} – ${esc(fmtDateId(s.departDate))}) — ${fmtIdr(stopBudget(s))}</li>`
  ).join('');
  const noteHtml = note
    ? `<p style="margin:12px 0 0;padding:10px;background:#f5f3ff;border-radius:8px;font-size:13px">${esc(note)}</p>`
    : '';
  return `
    <p style="margin:0 0 8px;"><strong>${esc(req.request_number || '')}</strong> · ${esc(req.status || '')}</p>
    <p style="margin:0 0 8px;">${esc(req.destination || '')}</p>
    <p style="margin:0 0 12px;color:#6b7280;font-size:13px">${esc(req.purpose || '')}</p>
    <p style="margin:0 0 8px;">${esc(fmtDateId(req.departure_date))} – ${esc(fmtDateId(req.return_date))}</p>
    <p style="margin:0 0 4px;">Rencana <strong>${fmtIdr(Number(req.estimated_budget))}</strong> · Aktual <strong>${fmtIdr(Number(req.actual_cost || detail.totalExpenses || 0))}</strong></p>
    ${stops ? `<ul style="margin:8px 0 0;padding-left:18px">${stops}</ul>` : ''}
    ${noteHtml}
  `;
}

export function travelEmailText(detail: TravelDetailBundle, note?: string): string {
  const req = detail.request || {};
  const plan = parseTravelPlan(req.itinerary, req.departure_city);
  const stops = plan.stops.map((s) => `- ${s.city}: ${fmtIdr(stopBudget(s))}`).join('\n');
  return [
    req.request_number, req.destination, req.purpose,
    `${fmtDateId(req.departure_date)} – ${fmtDateId(req.return_date)}`,
    `Rencana ${fmtIdr(Number(req.estimated_budget))} · Aktual ${fmtIdr(Number(req.actual_cost || 0))}`,
    stops,
    note || '',
  ].filter(Boolean).join('\n');
}
