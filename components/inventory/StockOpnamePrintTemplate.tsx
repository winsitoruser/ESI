import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface StockOpnamePrintTemplateProps {
  opname: any;
  items: any[];
  company?: {
    name: string;
    address: string;
    phone: string;
    logo?: string;
  };
}

const StockOpnamePrintTemplate: React.FC<StockOpnamePrintTemplateProps> = ({
  opname,
  items,
  company = {
    name: 'PT. Bedagang Indonesia',
    address: 'Jl. Industri Raya No. 123, Jakarta',
    phone: '021-12345678'
  }
}) => {
  const { formatCurrency } = useTranslation();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const stats = {
    total: items.length,
    counted: items.filter(i => i.physical_stock !== null).length,
    withVariance: items.filter(i => i.variance_category !== 'none').length,
    totalVariance: items.reduce((sum, i) => sum + (i.variance_value || 0), 0)
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
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-sm text-gray-600">{company.address}</p>
            <p className="text-sm text-gray-600">Telp: {company.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">LAPORAN STOCK OPNAME</h2>
            <p className="text-sm text-gray-600">ISO 9001:2015 Compliant</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 font-semibold w-1/3">Nomor Dokumen:</td>
                <td className="py-1">{opname.opname_number}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Tipe:</td>
                <td className="py-1">
                  {opname.opname_type === 'full' ? 'Full Count' : 
                   opname.opname_type === 'cycle' ? 'Cycle Count' : 'Spot Check'}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Gudang:</td>
                <td className="py-1">{opname.warehouse?.name || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Lokasi:</td>
                <td className="py-1">{opname.location?.name || 'Multi Lokasi'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 font-semibold w-1/3">Tanggal:</td>
                <td className="py-1">{formatDate(opname.scheduled_date)}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Dilakukan Oleh:</td>
                <td className="py-1">{opname.performed_by}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Disupervisi Oleh:</td>
                <td className="py-1">{opname.supervised_by || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Status:</td>
                <td className="py-1 font-semibold uppercase">{opname.status}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-6">
        <h3 className="font-bold text-gray-900 mb-3">RINGKASAN</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Item</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div>
            <p className="text-gray-600">Sudah Dihitung</p>
            <p className="text-xl font-bold">{stats.counted}</p>
          </div>
          <div>
            <p className="text-gray-600">Ada Selisih</p>
            <p className="text-xl font-bold text-yellow-600">{stats.withVariance}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Selisih</p>
            <p className={`text-xl font-bold ${stats.totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(stats.totalVariance)}
            </p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-xs border-collapse mb-6">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-600 px-2 py-2 text-left">No</th>
            <th className="border border-gray-600 px-2 py-2 text-left">SKU</th>
            <th className="border border-gray-600 px-2 py-2 text-left">Nama Produk</th>
            <th className="border border-gray-600 px-2 py-2 text-left">Lokasi</th>
            <th className="border border-gray-600 px-2 py-2 text-right">Stok Sistem</th>
            <th className="border border-gray-600 px-2 py-2 text-right">Stok Fisik</th>
            <th className="border border-gray-600 px-2 py-2 text-right">Selisih</th>
            <th className="border border-gray-600 px-2 py-2 text-right">Nilai Selisih</th>
            <th className="border border-gray-600 px-2 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
              <td className="border border-gray-300 px-2 py-2">{item.product?.sku}</td>
              <td className="border border-gray-300 px-2 py-2">{item.product?.name}</td>
              <td className="border border-gray-300 px-2 py-2">{item.location?.code}</td>
              <td className="border border-gray-300 px-2 py-2 text-right">
                {item.system_stock} {item.product?.unit}
              </td>
              <td className="border border-gray-300 px-2 py-2 text-right">
                {item.physical_stock !== null ? `${item.physical_stock} ${item.product?.unit}` : '-'}
              </td>
              <td className={`border border-gray-300 px-2 py-2 text-right font-semibold ${
                item.difference < 0 ? 'text-red-600' : item.difference > 0 ? 'text-green-600' : ''
              }`}>
                {item.difference !== 0 && (item.difference > 0 ? '+' : '')}{item.difference}
              </td>
              <td className={`border border-gray-300 px-2 py-2 text-right ${
                item.variance_value < 0 ? 'text-red-600' : item.variance_value > 0 ? 'text-green-600' : ''
              }`}>
                {formatCurrency(item.variance_value)}
              </td>
              <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                {item.variance_category === 'major' ? '⚠️ BESAR' :
                 item.variance_category === 'moderate' ? '⚠ SEDANG' :
                 item.variance_category === 'minor' ? 'Kecil' : '✓'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-bold">
            <td colSpan={7} className="border border-gray-300 px-2 py-2 text-right">
              TOTAL SELISIH:
            </td>
            <td className={`border border-gray-300 px-2 py-2 text-right ${
              stats.totalVariance < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(stats.totalVariance)}
            </td>
            <td className="border border-gray-300"></td>
          </tr>
        </tfoot>
      </table>

      {/* Variance Items Detail */}
      {stats.withVariance > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 border-b-2 border-gray-300 pb-2">
            DETAIL ITEM DENGAN SELISIH
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-yellow-100">
                <th className="border border-gray-300 px-2 py-2 text-left">Produk</th>
                <th className="border border-gray-300 px-2 py-2 text-right">Selisih</th>
                <th className="border border-gray-300 px-2 py-2 text-right">Nilai</th>
                <th className="border border-gray-300 px-2 py-2 text-center">Kategori</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => i.variance_category !== 'none').map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-2 py-2">
                    {item.product?.name} ({item.product?.sku})
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-semibold">
                    {item.difference > 0 ? '+' : ''}{item.difference} {item.product?.unit}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right">
                    {formatCurrency(item.variance_value)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {item.variance_category === 'major' ? 'BESAR' :
                     item.variance_category === 'moderate' ? 'SEDANG' : 'KECIL'}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-xs">
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {opname.notes && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-2">CATATAN:</h3>
          <p className="text-sm text-gray-700 border border-gray-300 rounded p-3 bg-gray-50">
            {opname.notes}
          </p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-12">
        <div className="text-center">
          <p className="text-sm font-semibold mb-16">Dilakukan Oleh,</p>
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">{opname.performed_by}</p>
            <p className="text-xs text-gray-600">Tanggal: {formatDate(opname.start_date || opname.scheduled_date)}</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold mb-16">Disupervisi Oleh,</p>
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">{opname.supervised_by || '_______________'}</p>
            <p className="text-xs text-gray-600">Tanggal: _______________</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold mb-16">Disetujui Oleh,</p>
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">{opname.approved_by || '_______________'}</p>
            <p className="text-xs text-gray-600">Tanggal: _______________</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600 text-center">
        <p>Dokumen ini dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        <p className="mt-1">Dokumen ini sesuai dengan standar ISO 9001:2015 untuk Sistem Manajemen Mutu</p>
        <p className="mt-1 font-semibold">Halaman 1 dari 1 - {opname.opname_number}</p>
      </div>
    </div>
  );
};

export default StockOpnamePrintTemplate;
