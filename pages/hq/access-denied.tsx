import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ShieldOff, ShieldAlert, ArrowLeft, Lock, Info, LogIn } from 'lucide-react';
import { useMyPermissions } from '../../contexts/PermissionContext';

export default function AccessDeniedPage() {
  const router = useRouter();
  const { data } = useMyPermissions();
  const required = (router.query.required as string) || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/40 to-orange-50/40 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
              <ShieldOff className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Akses Ditolak</h1>
              <p className="text-red-100 text-sm">403 — Forbidden</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">
                  Role Anda tidak memiliki izin untuk halaman tersebut.
                </p>
                <p className="text-amber-800 mt-1">
                  Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
                </p>
              </div>
            </div>
          </div>

          {required && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-2">
                <Lock className="w-3.5 h-3.5" />
                Permission Diperlukan
              </div>
              <code className="block bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono text-rose-600 break-all">
                {required}
              </code>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 text-xs text-blue-600 uppercase tracking-wider mb-2">
              <Info className="w-3.5 h-3.5" />
              Role Anda Saat Ini
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {data.roleCode || 'Tidak diketahui'}
              </span>
              {data.roleLevel != null && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  Level {data.roleLevel}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/hq"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login Ulang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
