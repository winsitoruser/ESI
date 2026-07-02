import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import { useSession, signOut } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Store, ClipboardCheck, FileText, Clock, CheckCircle2, 
  XCircle, ArrowRight, Building2, Shield, Upload, MapPin, 
  GitBranch, MessageSquare, Loader2, AlertTriangle, Sparkles,
  ChevronRight, RefreshCw, LogOut, User, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StatusInfo {
  status: string;
  label: string;
  description: string;
  color: string;
  canAccessDashboard: boolean;
  nextAction: string;
}

interface OnboardingData {
  tenant: {
    id: string;
    businessName: string;
    businessType: string | null;
    kybStatus: string;
    businessStructure: string;
    setupCompleted: boolean;
  } | null;
  kyb: {
    id: string;
    status: string;
    currentStep: number;
    completionPercentage: number;
    submittedAt: string | null;
    rejectionReason: string | null;
    reviewNotes: string | null;
    documentCount: number;
  } | null;
  statusInfo: StatusInfo;
}

const kybSteps = [
  { number: 1, title: 'Identitas Bisnis', description: 'Nama, kategori, dan detail usaha', icon: Building2 },
  { number: 2, title: 'Status Legalitas', description: 'Badan hukum dan nomor izin', icon: Shield },
  { number: 3, title: 'Upload Dokumen', description: 'KTP, NIB/SIUP, foto outlet', icon: Upload },
  { number: 4, title: 'PIC & Alamat', description: 'Penanggung jawab dan lokasi', icon: MapPin },
  { number: 5, title: 'Struktur Bisnis', description: 'Single outlet atau multi-cabang', icon: GitBranch },
  { number: 6, title: 'Keterangan Tambahan', description: 'Catatan dan referensi', icon: MessageSquare },
];

export default function OnboardingDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (sessionStatus === 'authenticated') {
      fetchStatus();
    }
  }, [sessionStatus]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/status');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        
        // If no tenant, redirect to welcome
        if (!json.data.tenant) {
          router.push('/onboarding/welcome');
          return;
        }
        
        // If active, redirect to dashboard
        if (json.data.statusInfo.canAccessDashboard) {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      toast.error('Gagal memuat status onboarding');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_kyb': return <ClipboardCheck className="w-8 h-8" />;
      case 'in_review': return <Clock className="w-8 h-8" />;
      case 'approved': return <CheckCircle2 className="w-8 h-8" />;
      case 'rejected': return <XCircle className="w-8 h-8" />;
      case 'active': return <Sparkles className="w-8 h-8" />;
      default: return <FileText className="w-8 h-8" />;
    }
  };

  const getStatusColors = (color: string) => {
    switch (color) {
      case 'yellow': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-800' };
      case 'blue': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-800' };
      case 'green': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-800' };
      case 'red': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500', badge: 'bg-red-100 text-red-800' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-500', badge: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat data onboarding...</p>
        </div>
      </div>
    );
  }

  const statusInfo = data?.statusInfo;
  const colors = getStatusColors(statusInfo?.color || 'gray');
  const completionPct = data?.kyb?.completionPercentage || 0;
  const currentStep = data?.kyb?.currentStep || 1;

  return (
    <>
      <Head>
        <title>Onboarding - BEDAGANG ERP</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600">
                BEDAGANG
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchStatus}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Profile & Logout */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[150px] truncate">
                    {session?.user?.name || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{session?.user?.email || '-'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        router.push('/profile');
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <span>Profil Saya</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        signOut({ callbackUrl: '/auth/login' });
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Selamat Datang, {session?.user?.name}!
            </h2>
            <p className="text-lg text-gray-600">
              {data?.tenant?.businessName && (
                <span className="font-medium text-sky-600">{data.tenant.businessName}</span>
              )}
              {data?.tenant?.businessName ? ' — ' : ''}
              Lengkapi proses onboarding untuk mulai menggunakan Bedagang.
            </p>
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-6 mb-8`}
          >
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl ${colors.badge}`}>
                {getStatusIcon(statusInfo?.status || '')}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-1">
                  <h3 className={`text-lg font-bold ${colors.text}`}>
                    {statusInfo?.label}
                  </h3>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                    {statusInfo?.status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600">{statusInfo?.description}</p>
                
                {statusInfo?.status === 'rejected' && data?.kyb?.rejectionReason && (
                  <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-700">Alasan Penolakan:</span>
                    </div>
                    <p className="text-sm text-red-700">{data.kyb.rejectionReason}</p>
                  </div>
                )}

                {statusInfo?.nextAction && (
                  <Link 
                    href={statusInfo.nextAction}
                    className={`mt-4 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:shadow-lg transition-all`}
                  >
                    <span>{statusInfo.status === 'rejected' ? 'Perbaiki Data' : 'Lanjutkan KYB'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Progres KYB</h3>
              <span className="text-sm font-medium text-sky-600">{completionPct}% selesai</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
              />
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kybSteps.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.number;
                const isCurrent = currentStep === step.number;
                const isLocked = currentStep < step.number;
                const isSubmitted = data?.kyb?.status === 'submitted' || data?.kyb?.status === 'in_review';

                return (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isCompleted 
                        ? 'border-emerald-200 bg-emerald-50' 
                        : isCurrent 
                          ? 'border-sky-300 bg-sky-50 shadow-md' 
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : isCurrent 
                            ? 'bg-sky-500 text-white' 
                            : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium ${
                            isCompleted ? 'text-emerald-600' : isCurrent ? 'text-sky-600' : 'text-gray-400'
                          }`}>
                            Step {step.number}
                          </span>
                          {isCompleted && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Selesai</span>
                          )}
                        </div>
                        <h4 className={`font-medium text-sm mt-0.5 ${
                          isLocked ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </h4>
                        <p className={`text-xs mt-0.5 ${
                          isLocked ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {isCurrent && !isSubmitted && (
                      <Link
                        href="/onboarding/kyb"
                        className="mt-3 flex items-center justify-center space-x-1 text-sm font-medium text-sky-600 hover:text-sky-700 transition"
                      >
                        <span>Lanjutkan</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Timeline / Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Timeline Proses</h3>
            <div className="space-y-4">
              {[
                { 
                  step: 1,
                  title: 'Step 1: Profile Completion', 
                  desc: 'Lengkapi data usaha, legalitas, dan upload dokumen KYB.',
                  done: completionPct >= 100 || ['submitted', 'in_review', 'approved', 'active'].includes(data?.kyb?.status || ''),
                  active: statusInfo?.status === 'pending_kyb',
                  icon: ClipboardCheck 
                },
                { 
                  step: 2,
                  title: 'Step 2: Document Verification', 
                  desc: 'Tim Bedagang melakukan review dan verifikasi manual dokumen Anda (1-2 hari kerja).',
                  done: ['approved', 'active'].includes(statusInfo?.status || ''),
                  active: statusInfo?.status === 'in_review',
                  icon: Clock 
                },
                { 
                  step: 3,
                  title: 'Step 3: Technical Provisioning', 
                  desc: 'Sistem sedang mempersiapkan akun: generate Business ID, cloning konfigurasi, dan aktivasi modul.',
                  done: statusInfo?.status === 'active',
                  active: statusInfo?.status === 'approved',
                  icon: Sparkles 
                },
                { 
                  step: 4,
                  title: 'Step 4: Ready to Use', 
                  desc: data?.tenant?.businessStructure === 'multi_branch'
                    ? `Akun HQ (${data?.tenant?.businessName}) sudah aktif. Anda bisa mengelola semua cabang dari satu dashboard.`
                    : 'Dashboard ERP Bedagang siap digunakan untuk bertransaksi!',
                  done: statusInfo?.status === 'active',
                  active: false,
                  icon: CheckCircle2 
                },
              ].map((item, idx) => {
                const TimeIcon = item.icon;
                return (
                  <div key={idx} className="flex items-start space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.done 
                        ? 'bg-emerald-500 text-white' 
                        : item.active 
                          ? 'bg-sky-500 text-white animate-pulse' 
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                      <TimeIcon className="w-4 h-4" />
                    </div>
                    <div className={`flex-1 pb-4 ${idx < 3 ? 'border-b border-gray-100' : ''}`}>
                      <h4 className={`font-medium text-sm ${item.done || item.active ? 'text-gray-900' : 'text-gray-400'}`}>
                        {item.title}
                        {item.done && <span className="ml-2 text-xs text-emerald-600">(Selesai)</span>}
                        {item.active && <span className="ml-2 text-xs text-sky-600">(Sedang Berlangsung)</span>}
                      </h4>
                      <p className={`text-xs mt-0.5 ${item.done || item.active ? 'text-gray-500' : 'text-gray-300'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Enter ERP Dashboard - Step 4: Ready to Use */}
          {statusInfo?.status === 'active' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-8 text-center text-white shadow-xl mt-8"
            >
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-90" />
              <h3 className="text-2xl font-bold mb-2">Akun Anda Sudah Aktif!</h3>
              {data?.tenant?.businessStructure === 'multi_branch' ? (
                <p className="text-emerald-100 mb-1">
                  HQ <strong>{data?.tenant?.businessName}</strong> siap digunakan.
                  Anda memiliki akses penuh ke semua cabang.
                </p>
              ) : (
                <p className="text-emerald-100 mb-1">
                  <strong>{data?.tenant?.businessName}</strong> siap untuk bertransaksi.
                </p>
              )}
              <p className="text-emerald-200 text-xs mb-6">
                Business ID: <span className="font-mono font-bold">{(data?.tenant as any)?.businessCode || '-'}</span>
                {' | '}
                Struktur: {data?.tenant?.businessStructure === 'multi_branch' ? 'Multi-Branch (HQ)' : 'Single Outlet'}
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 px-8 py-3.5 bg-white text-emerald-700 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <span>Masuk Dashboard ERP</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          )}

          {/* Help */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-500">
              Butuh bantuan? Hubungi tim kami di{' '}
              <a href="mailto:support@bedagang.com" className="text-sky-600 hover:underline">
                support@bedagang.com
              </a>
              {' '}atau WhatsApp{' '}
              <a href="https://wa.me/6281234567890" className="text-sky-600 hover:underline">
                +62 812-3456-7890
              </a>
            </p>
          </motion.div>
        </main>
      </div>
    </>
  );
}
