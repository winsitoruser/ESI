import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface IncidentReportPrintTemplateProps {
  incident: any;
  company?: {
    name: string;
    address: string;
    phone: string;
    logo?: string;
  };
}

const IncidentReportPrintTemplate: React.FC<IncidentReportPrintTemplateProps> = ({
  incident,
  company = {
    name: 'PT. Bedagang Indonesia',
    address: 'Jl. Industri Raya No. 123, Jakarta',
    phone: '021-12345678'
  }
}) => {
  const { formatCurrency } = useTranslation();

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="print-template bg-white p-8 max-w-[210mm] mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style jsx>{`
        @media print {
          .print-template {
            padding: 0;
            max-width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-2 border-red-600 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-sm text-gray-600">{company.address}</p>
            <p className="text-sm text-gray-600">Telp: {company.phone}</p>
          </div>
          <div className="text-right">
            <div className="bg-red-600 text-white px-4 py-2 rounded mb-2">
              <h2 className="text-xl font-bold">LAPORAN INSIDEN</h2>
              <p className="text-sm">Stock Opname Variance Report</p>
            </div>
            <p className="text-xs text-gray-600">ISO 9001:2015 & ISO 22000:2018</p>
          </div>
        </div>
      </div>

      {/* Incident Info */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 font-semibold w-1/2">Nomor Insiden:</td>
                  <td className="py-1 text-red-700 font-bold">{incident.incident_number}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Nomor Stock Opname:</td>
                  <td className="py-1">{incident.stockOpname?.opname_number || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Tanggal Insiden:</td>
                  <td className="py-1">{formatDateTime(incident.created_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 font-semibold w-1/2">Kategori Selisih:</td>
                  <td className="py-1">
                    <span className={`px-3 py-1 rounded font-bold ${
                      incident.variance_category === 'major' ? 'bg-red-600 text-white' :
                      incident.variance_category === 'moderate' ? 'bg-yellow-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {incident.variance_category === 'major' ? 'BESAR' :
                       incident.variance_category === 'moderate' ? 'SEDANG' : 'KECIL'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Status Persetujuan:</td>
                  <td className="py-1">
                    <span className={`px-3 py-1 rounded font-semibold ${
                      incident.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                      incident.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {incident.approval_status === 'approved' ? 'DISETUJUI' :
                       incident.approval_status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Level Persetujuan:</td>
                  <td className="py-1 font-semibold">{incident.approval_level}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product & Variance Info */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-3 bg-gray-200 px-3 py-2 rounded">
          1. INFORMASI PRODUK & SELISIH
        </h3>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-semibold w-1/4">Nama Produk:</td>
              <td className="py-2" colSpan={3}>{incident.product?.name}</td>
            </tr>
            <tr className="border-b bg-gray-50">
              <td className="py-2 font-semibold">SKU:</td>
              <td className="py-2">{incident.product?.sku}</td>
              <td className="py-2 font-semibold">Kategori:</td>
              <td className="py-2">{incident.product?.category || '-'}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-semibold">Selisih Kuantitas:</td>
              <td className="py-2">
                <span className={`font-bold text-lg ${incident.variance_quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {incident.variance_quantity > 0 ? '+' : ''}{incident.variance_quantity} {incident.product?.unit}
                </span>
              </td>
              <td className="py-2 font-semibold">Nilai Selisih:</td>
              <td className="py-2">
                <span className={`font-bold text-lg ${incident.variance_value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(incident.variance_value)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Root Cause Analysis - 5 Whys */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-3 bg-gray-200 px-3 py-2 rounded">
          2. ANALISIS AKAR MASALAH (Metode 5 Mengapa)
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Mengapa 1', value: incident.why_1 },
            { label: 'Mengapa 2', value: incident.why_2 },
            { label: 'Mengapa 3', value: incident.why_3 },
            { label: 'Mengapa 4', value: incident.why_4 },
            { label: 'Mengapa 5', value: incident.why_5 }
          ].map((why, index) => (
            <div key={index} className="flex">
              <div className="w-24 font-semibold text-sm bg-blue-100 px-3 py-2 rounded-l border border-blue-300">
                {why.label}:
              </div>
              <div className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r bg-white">
                {why.value || '-'}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <p className="font-bold text-gray-900 mb-2">🎯 AKAR MASALAH:</p>
          <p className="text-gray-800">{incident.root_cause}</p>
        </div>
      </div>

      {/* Evidence & Investigation */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-3 bg-gray-200 px-3 py-2 rounded">
          3. BUKTI & INVESTIGASI
        </h3>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm mb-1">Catatan Bukti:</p>
            <div className="border border-gray-300 rounded p-3 bg-gray-50 text-sm">
              {incident.evidence_notes || 'Tidak ada catatan bukti'}
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Pernyataan Saksi:</p>
            <div className="border border-gray-300 rounded p-3 bg-gray-50 text-sm">
              {incident.witness_statement || 'Tidak ada pernyataan saksi'}
            </div>
          </div>
        </div>
      </div>

      {/* Corrective & Preventive Actions */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-3 bg-gray-200 px-3 py-2 rounded">
          4. TINDAKAN KOREKTIF & PREVENTIF
        </h3>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm mb-1 text-red-700">⚡ Tindakan Segera (Immediate Action):</p>
            <div className="border-2 border-red-300 rounded p-3 bg-red-50 text-sm">
              {incident.immediate_action || '-'}
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1 text-orange-700">🔧 Tindakan Korektif (Corrective Action):</p>
            <div className="border-2 border-orange-300 rounded p-3 bg-orange-50 text-sm">
              {incident.corrective_action}
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1 text-green-700">🛡️ Tindakan Preventif (Preventive Action):</p>
            <div className="border-2 border-green-300 rounded p-3 bg-green-50 text-sm">
              {incident.preventive_action || '-'}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-sm mb-1">Penanggung Jawab:</p>
            <div className="border border-gray-300 rounded p-2 bg-white">
              {incident.responsible_person || '-'}
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Target Penyelesaian:</p>
            <div className="border border-gray-300 rounded p-2 bg-white">
              {formatDate(incident.target_date)}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Section */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-3 bg-gray-200 px-3 py-2 rounded">
          5. PERSETUJUAN & VERIFIKASI
        </h3>
        <table className="w-full text-sm border-collapse border border-gray-300">
          <tbody>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 font-semibold w-1/4">Level Persetujuan:</td>
              <td className="border border-gray-300 px-3 py-2">{incident.approval_level}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 font-semibold">Status:</td>
              <td className="border border-gray-300 px-3 py-2">
                <span className={`px-3 py-1 rounded font-semibold ${
                  incident.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                  incident.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {incident.approval_status === 'approved' ? 'DISETUJUI' :
                   incident.approval_status === 'rejected' ? 'DITOLAK' : 'MENUNGGU PERSETUJUAN'}
                </span>
              </td>
            </tr>
            {incident.approved_by && (
              <>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 font-semibold">Disetujui Oleh:</td>
                  <td className="border border-gray-300 px-3 py-2">{incident.approved_by}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold">Tanggal Persetujuan:</td>
                  <td className="border border-gray-300 px-3 py-2">{formatDateTime(incident.approved_date)}</td>
                </tr>
              </>
            )}
            {incident.approver_comments && (
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 font-semibold">Komentar Penyetuju:</td>
                <td className="border border-gray-300 px-3 py-2">{incident.approver_comments}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compliance Statement */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
        <p className="font-bold text-blue-900 mb-2">📋 KEPATUHAN STANDAR</p>
        <p className="text-sm text-blue-800">
          Laporan insiden ini disusun sesuai dengan:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
          <li><strong>ISO 9001:2015</strong> - Sistem Manajemen Mutu (Klausul 10.2: Ketidaksesuaian dan Tindakan Korektif)</li>
          <li><strong>ISO 22000:2018</strong> - Sistem Manajemen Keamanan Pangan (Klausul 10.1: Ketidaksesuaian dan Tindakan Korektif)</li>
          <li><strong>CAPA (Corrective and Preventive Action)</strong> - Metodologi Perbaikan Berkelanjutan</li>
        </ul>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-12">
        <div className="text-center">
          <p className="text-sm font-semibold mb-16">Dibuat Oleh,</p>
          <div className="border-t-2 border-gray-800 pt-2">
            <p className="font-semibold">{incident.created_by?.name || 'Admin'}</p>
            <p className="text-xs text-gray-600">Tanggal: {formatDate(incident.created_at)}</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold mb-16">Penanggung Jawab,</p>
          <div className="border-t-2 border-gray-800 pt-2">
            <p className="font-semibold">{incident.responsible_person || '_______________'}</p>
            <p className="text-xs text-gray-600">Tanggal: _______________</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold mb-16">Disetujui Oleh,</p>
          <div className="border-t-2 border-gray-800 pt-2">
            <p className="font-semibold">{incident.approved_by || '_______________'}</p>
            <p className="text-xs text-gray-600">
              {incident.approved_date ? `Tanggal: ${formatDate(incident.approved_date)}` : 'Tanggal: _______________'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-gray-300 text-xs text-gray-600">
        <div className="flex justify-between">
          <div>
            <p className="font-semibold">Dokumen Rahasia - Internal Use Only</p>
            <p>Dokumen ini dicetak pada: {new Date().toLocaleString('id-ID')}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{incident.incident_number}</p>
            <p>Halaman 1 dari 1</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentReportPrintTemplate;
