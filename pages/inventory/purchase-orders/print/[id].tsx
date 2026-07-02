import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import Head from 'next/head';
import { FaBuilding, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaPrint } from 'react-icons/fa';

const PrintPurchaseOrder: React.FC = () => {
  const router = useRouter();
  const { t, formatCurrency } = useTranslation();
  const { id } = router.query;
  const printRef = useRef<HTMLDivElement>(null);

  // Mock data - in real app, fetch based on id
  const order = {
    id: '1',
    poNumber: 'PO-2024-001',
    supplier: {
      name: 'PT Kopi Nusantara',
      contact: '021-12345678',
      email: 'info@kopinusantara.com',
      address: 'Jl. Kopi No. 123, Jakarta Selatan 12345'
    },
    company: {
      name: 'BEDAGANG Cloud POS',
      address: 'Jl. Bisnis No. 456, Jakarta Pusat 10110',
      phone: '021-98765432',
      email: 'info@bedagang.com',
      npwp: '01.234.567.8-901.000'
    },
    orderDate: '2024-01-20',
    expectedDelivery: '2024-01-27',
    dueDate: '2024-02-20',
    paymentTerms: '30 days',
    items: [
      {
        no: 1,
        productName: 'Kopi Arabica Premium 250g',
        sku: 'KOP-001',
        quantity: 100,
        unitCost: 30000,
        subtotal: 3000000
      }
    ],
    subtotal: 3000000,
    tax: 300000,
    discount: 0,
    totalAmount: 3300000,
    notes: 'Mohon pengiriman sesuai jadwal yang telah disepakati. Barang harus dalam kondisi baik dan sesuai spesifikasi.',
    createdBy: 'Admin Purchasing',
    approvedBy: 'Manager Operations'
  };


  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Head>
        <title>Print Purchase Order - {order.poNumber} | BEDAGANG</title>
      </Head>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area,
          #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>

      {/* Print Button - Hidden on print */}
      <div className="no-print fixed top-4 right-4 z-50 flex space-x-2">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <FaPrint />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Printable Area */}
      <div id="printable-area" ref={printRef} className="max-w-4xl mx-auto bg-white p-8 my-8 shadow-lg">
        {/* Header */}
        <div className="border-b-4 border-blue-600 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 mb-2">PURCHASE ORDER</h1>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-semibold text-lg text-gray-900">{order.company.name}</p>
                <p className="flex items-center"><FaMapMarkerAlt className="mr-2" /> {order.company.address}</p>
                <p className="flex items-center"><FaPhone className="mr-2" /> {order.company.phone}</p>
                <p>Email: {order.company.email}</p>
                <p>NPWP: {order.company.npwp}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-3">
                <p className="text-sm">PO Number</p>
                <p className="text-xl font-bold">{order.poNumber}</p>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-semibold">Date:</span> {order.orderDate}</p>
                <p><span className="font-semibold">Expected:</span> {order.expectedDelivery}</p>
                <p><span className="font-semibold">Payment Terms:</span> {order.paymentTerms}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <FaBuilding className="mr-2 text-blue-600" />
            Supplier Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-700">Company Name:</p>
              <p className="text-lg font-bold text-gray-900">{order.supplier.name}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Contact:</p>
              <p>{order.supplier.contact}</p>
              <p>{order.supplier.email}</p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold text-gray-700">Address:</p>
              <p>{order.supplier.address}</p>
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-blue-700 p-3 text-left text-sm">No</th>
                <th className="border border-blue-700 p-3 text-left text-sm">Product Description</th>
                <th className="border border-blue-700 p-3 text-left text-sm">SKU</th>
                <th className="border border-blue-700 p-3 text-center text-sm">Qty</th>
                <th className="border border-blue-700 p-3 text-right text-sm">Unit Price</th>
                <th className="border border-blue-700 p-3 text-right text-sm">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.no} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3 text-center">{item.no}</td>
                  <td className="border border-gray-300 p-3">
                    <p className="font-semibold">{item.productName}</p>
                  </td>
                  <td className="border border-gray-300 p-3">{item.sku}</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">{item.quantity}</td>
                  <td className="border border-gray-300 p-3 text-right">{formatCurrency(item.unitCost)}</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between py-2 border-b text-green-600">
                  <span>Discount:</span>
                  <span className="font-semibold">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">PPN 10%:</span>
                <span className="font-semibold">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between py-3 bg-blue-600 text-white px-4 rounded-lg">
                <span className="text-lg font-bold">TOTAL:</span>
                <span className="text-xl font-bold">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <h3 className="font-bold text-gray-900 mb-2">Payment Information</h3>
          <div className="text-sm space-y-1">
            <p><span className="font-semibold">Due Date:</span> {order.dueDate}</p>
            <p><span className="font-semibold">Payment Terms:</span> {order.paymentTerms}</p>
            <p><span className="font-semibold">Bank Account:</span> BCA - 1234567890 (PT BEDAGANG)</p>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-2">Notes & Terms:</h3>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t-2 border-gray-300">
          <div className="text-center">
            <p className="text-sm font-semibold mb-16">Prepared By</p>
            <div className="border-t-2 border-gray-400 pt-2">
              <p className="font-bold">{order.createdBy}</p>
              <p className="text-xs text-gray-600">Purchasing</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-16">Approved By</p>
            <div className="border-t-2 border-gray-400 pt-2">
              <p className="font-bold">{order.approvedBy}</p>
              <p className="text-xs text-gray-600">Management</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-16">Received By</p>
            <div className="border-t-2 border-gray-400 pt-2">
              <p className="font-bold">_________________</p>
              <p className="text-xs text-gray-600">Supplier</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>This is a computer-generated document. No signature is required.</p>
          <p className="mt-1">For inquiries, please contact: {order.company.phone} | {order.company.email}</p>
        </div>
      </div>
    </>
  );
};

export default PrintPurchaseOrder;
