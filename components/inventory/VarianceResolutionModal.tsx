import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import {
  FaTimes, FaExclamationTriangle, FaCheckCircle, FaSearch,
  FaCamera, FaFileAlt, FaUserCheck, FaPrint, FaDownload,
  FaClipboardList, FaHistory, FaExclamationCircle, FaInfoCircle
} from 'react-icons/fa';

interface VarianceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  location: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  variancePercentage: number;
  unitCost: number;
  varianceValue: number;
  varianceCategory: 'minor' | 'moderate' | 'major' | 'none';
}

interface VarianceResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  varianceItem: VarianceItem | null;
  onSubmit: (data: any) => void;
}

const VarianceResolutionModal: React.FC<VarianceResolutionModalProps> = ({
  isOpen,
  onClose,
  varianceItem,
  onSubmit
}) => {
  const { formatCurrency } = useTranslation();
  const [activeTab, setActiveTab] = useState('recount');
  const [recountValue, setRecountValue] = useState<number>(0);
  const [recountBy, setRecountBy] = useState<string>('');
  const [recountConfirmed, setRecountConfirmed] = useState(false);
  
  // Investigation
  const [rootCause, setRootCause] = useState<string>('');
  const [why1, setWhy1] = useState<string>('');
  const [why2, setWhy2] = useState<string>('');
  const [why3, setWhy3] = useState<string>('');
  const [why4, setWhy4] = useState<string>('');
  const [why5, setWhy5] = useState<string>('');
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');
  const [witnessStatement, setWitnessStatement] = useState<string>('');
  
  // Corrective Action
  const [immediateAction, setImmediateAction] = useState<string>('');
  const [correctiveAction, setCorrectiveAction] = useState<string>('');
  const [preventiveAction, setPreventiveAction] = useState<string>('');
  const [responsiblePerson, setResponsiblePerson] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  
  // Approval
  const [approvalLevel, setApprovalLevel] = useState<string>('');
  const [approverComments, setApproverComments] = useState<string>('');


  const getVarianceBadge = (category: string) => {
    const badges = {
      minor: { color: 'bg-blue-100 text-blue-700', label: 'Kecil', icon: FaInfoCircle },
      moderate: { color: 'bg-yellow-100 text-yellow-700', label: 'Sedang', icon: FaExclamationTriangle },
      major: { color: 'bg-red-100 text-red-700', label: 'Besar', icon: FaExclamationCircle }
    };
    const badge = badges[category as keyof typeof badges] || badges.minor;
    const Icon = badge.icon;
    
    return (
      <Badge className={badge.color}>
        <Icon className="mr-1" />
        {badge.label}
      </Badge>
    );
  };

  const getApprovalLevel = (category: string) => {
    const levels = {
      minor: 'Supervisor',
      moderate: 'Manajer',
      major: 'Direktur/GM'
    };
    return levels[category as keyof typeof levels] || 'Supervisor';
  };

  const handleRecount = () => {
    if (!recountValue || !recountBy) {
      alert('Mohon lengkapi data recount!');
      return;
    }
    setRecountConfirmed(true);
    alert('Recount berhasil dikonfirmasi! Silakan lanjut ke Investigation.');
    setActiveTab('investigation');
  };

  const handleSubmitIncident = () => {
    if (!rootCause || !immediateAction || !correctiveAction) {
      alert('Mohon lengkapi semua data yang diperlukan!');
      return;
    }

    const incidentData = {
      incidentNumber: `INC-2024-${String(Date.now()).slice(-4)}`,
      varianceItem,
      recount: {
        value: recountValue,
        by: recountBy,
        confirmed: recountConfirmed,
        date: new Date().toISOString()
      },
      investigation: {
        rootCause,
        fiveWhys: { why1, why2, why3, why4, why5 },
        evidence: evidenceNotes,
        witness: witnessStatement
      },
      correctiveAction: {
        immediate: immediateAction,
        corrective: correctiveAction,
        preventive: preventiveAction,
        responsible: responsiblePerson,
        targetDate
      },
      approval: {
        level: getApprovalLevel(varianceItem?.varianceCategory || 'minor'),
        status: 'pending',
        comments: approverComments
      },
      createdAt: new Date().toISOString(),
      createdBy: 'Admin'
    };

    onSubmit(incidentData);
    handleClose();
  };

  const handlePrintReport = () => {
    alert('Generating Incident Report for printing...\n\nReport will include:\n- Variance Details\n- Investigation Findings\n- Root Cause Analysis\n- Corrective Actions\n- Approval Signatures');
  };

  const handleClose = () => {
    // Reset all states
    setActiveTab('recount');
    setRecountValue(0);
    setRecountBy('');
    setRecountConfirmed(false);
    setRootCause('');
    setWhy1(''); setWhy2(''); setWhy3(''); setWhy4(''); setWhy5('');
    setEvidenceNotes('');
    setWitnessStatement('');
    setImmediateAction('');
    setCorrectiveAction('');
    setPreventiveAction('');
    setResponsiblePerson('');
    setTargetDate('');
    setApproverComments('');
    onClose();
  };

  if (!isOpen || !varianceItem) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaExclamationTriangle className="mr-3 text-orange-600" />
                Variance Resolution & Incident Report
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                ISO 9001:2015 Compliant - Nonconformity & Corrective Action
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Variance Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{varianceItem.productName}</h3>
              <p className="text-sm text-gray-600">SKU: {varianceItem.sku} • Location: {varianceItem.location}</p>
            </div>
            {getVarianceBadge(varianceItem.varianceCategory)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">System Stock</p>
              <p className="text-lg font-bold text-gray-900">{varianceItem.systemStock}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Physical Count</p>
              <p className="text-lg font-bold text-gray-900">{varianceItem.physicalStock}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Variance</p>
              <p className={`text-lg font-bold ${varianceItem.difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {varianceItem.difference > 0 ? '+' : ''}{varianceItem.difference}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Variance %</p>
              <p className={`text-lg font-bold ${varianceItem.variancePercentage < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {varianceItem.variancePercentage.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Financial Impact</p>
              <p className={`text-lg font-bold ${varianceItem.varianceValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(varianceItem.varianceValue))}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-900">
              <strong>Required Approval Level:</strong> {getApprovalLevel(varianceItem.varianceCategory)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recount">
                <FaSearch className="mr-2" />
                1. Hitung Ulang
              </TabsTrigger>
              <TabsTrigger value="investigation">
                <FaClipboardList className="mr-2" />
                2. Investigasi
              </TabsTrigger>
              <TabsTrigger value="corrective">
                <FaCheckCircle className="mr-2" />
                3. Tindakan Korektif
              </TabsTrigger>
              <TabsTrigger value="approval">
                <FaUserCheck className="mr-2" />
                4. Persetujuan
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Recount */}
            <TabsContent value="recount" className="space-y-4 mt-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                  <FaExclamationTriangle className="mr-2" />
                  Langkah 1: Verifikasi Hitung Ulang
                </h3>
                <p className="text-sm text-yellow-800">
                  Lakukan hitung ulang untuk memverifikasi selisih. Gunakan penghitung yang berbeda dari penghitungan pertama (metode blind count).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hasil Recount (Physical Stock)
                  </label>
                  <Input
                    type="number"
                    value={recountValue || ''}
                    onChange={(e) => setRecountValue(parseFloat(e.target.value) || 0)}
                    placeholder="Masukkan hasil recount"
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Original count: {varianceItem.physicalStock}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Recount Dilakukan Oleh
                  </label>
                  <Input
                    type="text"
                    value={recountBy}
                    onChange={(e) => setRecountBy(e.target.value)}
                    placeholder="Nama counter"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Harus berbeda dari counter pertama
                  </p>
                </div>
              </div>

              {recountValue > 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Hasil Perbandingan:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Original Count</p>
                      <p className="text-lg font-bold">{varianceItem.physicalStock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Recount</p>
                      <p className="text-lg font-bold">{recountValue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Difference</p>
                      <p className={`text-lg font-bold ${recountValue !== varianceItem.physicalStock ? 'text-red-600' : 'text-green-600'}`}>
                        {recountValue === varianceItem.physicalStock ? 'Match ✓' : `±${Math.abs(recountValue - varianceItem.physicalStock)}`}
                      </p>
                    </div>
                  </div>
                  
                  {recountValue !== varianceItem.physicalStock && (
                    <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm text-red-800">
                        <strong>Warning:</strong> Recount tidak match dengan original count. Diperlukan third count untuk konfirmasi.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleRecount}
                  disabled={!recountValue || !recountBy}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FaCheckCircle className="mr-2" />
                  Konfirmasi Hitung Ulang & Lanjutkan
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Investigation */}
            <TabsContent value="investigation" className="space-y-4 mt-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <FaClipboardList className="mr-2" />
                  Langkah 2: Analisis Akar Masalah (Metode 5 Mengapa)
                </h3>
                <p className="text-sm text-blue-800">
                  Identifikasi akar masalah dengan metode 5 Mengapa. Tanyakan "Mengapa?" secara berulang hingga menemukan akar masalah.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Problem Statement
                  </label>
                  <Input
                    type="text"
                    value={`Variance detected: ${varianceItem.difference} units (${varianceItem.variancePercentage.toFixed(2)}%)`}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Why 1: Mengapa terjadi variance?
                  </label>
                  <Input
                    type="text"
                    value={why1}
                    onChange={(e) => setWhy1(e.target.value)}
                    placeholder="Contoh: Physical count berbeda dengan system"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Why 2: Mengapa physical berbeda?
                  </label>
                  <Input
                    type="text"
                    value={why2}
                    onChange={(e) => setWhy2(e.target.value)}
                    placeholder="Contoh: Item tidak ditemukan di lokasi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Why 3: Mengapa tidak di lokasi?
                  </label>
                  <Input
                    type="text"
                    value={why3}
                    onChange={(e) => setWhy3(e.target.value)}
                    placeholder="Contoh: Tidak ada tracking lokasi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Why 4: Mengapa tidak ada tracking?
                  </label>
                  <Input
                    type="text"
                    value={why4}
                    onChange={(e) => setWhy4(e.target.value)}
                    placeholder="Contoh: Staff tidak ikuti SOP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Why 5: Mengapa tidak ikuti SOP?
                  </label>
                  <Input
                    type="text"
                    value={why5}
                    onChange={(e) => setWhy5(e.target.value)}
                    placeholder="Contoh: Kurang training dan supervisi"
                  />
                </div>

                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Root Cause (Akar Masalah)
                  </label>
                  <textarea
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="Kesimpulan root cause dari 5 Whys analysis..."
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Evidence & Documentation
                  </label>
                  <textarea
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    placeholder="Dokumentasi bukti: foto, CCTV, dokumen, dll..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Witness Statement
                  </label>
                  <textarea
                    value={witnessStatement}
                    onChange={(e) => setWitnessStatement(e.target.value)}
                    placeholder="Keterangan saksi atau staff terkait..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setActiveTab('corrective')}
                  disabled={!rootCause}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Lanjut ke Tindakan Korektif
                  <FaCheckCircle className="ml-2" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab 3: Corrective Action */}
            <TabsContent value="corrective" className="space-y-4 mt-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                  <FaCheckCircle className="mr-2" />
                  Langkah 3: Tindakan Korektif & Preventif
                </h3>
                <p className="text-sm text-green-800">
                  Tentukan tindakan korektif dan preventif untuk menyelesaikan masalah dan mencegah terulang kembali.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Immediate Action (Tindakan Segera)
                  </label>
                  <textarea
                    value={immediateAction}
                    onChange={(e) => setImmediateAction(e.target.value)}
                    placeholder="Tindakan yang sudah/akan segera dilakukan untuk mengatasi masalah..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contoh: Isolasi item, freeze transaksi, recount ulang
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Corrective Action (Tindakan Korektif)
                  </label>
                  <textarea
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    placeholder="Tindakan untuk memperbaiki masalah yang ada..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contoh: Update SOP, perbaiki proses, training ulang staff
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Preventive Action (Tindakan Preventif)
                  </label>
                  <textarea
                    value={preventiveAction}
                    onChange={(e) => setPreventiveAction(e.target.value)}
                    placeholder="Tindakan untuk mencegah masalah terulang di masa depan..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contoh: Implementasi barcode scanner, daily supervision, sistem alert
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Responsible Person (PIC)
                    </label>
                    <Input
                      type="text"
                      value={responsiblePerson}
                      onChange={(e) => setResponsiblePerson(e.target.value)}
                      placeholder="Nama penanggung jawab"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Target Completion Date
                    </label>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setActiveTab('approval')}
                  disabled={!immediateAction || !correctiveAction || !preventiveAction}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Lanjut ke Persetujuan
                  <FaUserCheck className="ml-2" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab 4: Approval */}
            <TabsContent value="approval" className="space-y-4 mt-6">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                  <FaUserCheck className="mr-2" />
                  Langkah 4: Persetujuan & Dokumentasi
                </h3>
                <p className="text-sm text-purple-800">
                  Review lengkap laporan insiden dan kirim untuk persetujuan sesuai level yang diperlukan.
                </p>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Ringkasan Laporan Insiden:</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600">Product:</span>
                      <span className="ml-2 font-semibold">{varianceItem.productName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">SKU:</span>
                      <span className="ml-2 font-semibold">{varianceItem.sku}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Variance:</span>
                      <span className="ml-2 font-semibold text-red-600">{varianceItem.difference} units</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Financial Impact:</span>
                      <span className="ml-2 font-semibold text-red-600">{formatCurrency(Math.abs(varianceItem.varianceValue))}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-300">
                    <p className="text-gray-600 mb-1">Root Cause:</p>
                    <p className="font-semibold">{rootCause || '-'}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-300">
                    <p className="text-gray-600 mb-1">Corrective Action:</p>
                    <p className="font-semibold">{correctiveAction || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Approval Level */}
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-900 font-semibold">Level Persetujuan yang Diperlukan:</p>
                    <p className="text-lg font-bold text-blue-700">{getApprovalLevel(varianceItem.varianceCategory)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-900">Kategori Selisih:</p>
                    {getVarianceBadge(varianceItem.varianceCategory)}
                  </div>
                </div>
              </div>

              {/* Approver Comments */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Komentar untuk Penyetuju
                </label>
                <textarea
                  value={approverComments}
                  onChange={(e) => setApproverComments(e.target.value)}
                  placeholder="Catatan tambahan untuk penyetuju..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={handlePrintReport}
                  >
                    <FaPrint className="mr-2" />
                    Cetak Laporan
                  </Button>
                  <Button
                    variant="outline"
                  >
                    <FaDownload className="mr-2" />
                    Ekspor PDF
                  </Button>
                </div>

                <Button
                  onClick={handleSubmitIncident}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <FaCheckCircle className="mr-2" />
                  Kirim untuk Persetujuan
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default VarianceResolutionModal;
