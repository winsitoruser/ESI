import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Users, RefreshCw, Download, UserCheck, UserMinus, Clock, Award,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Building2,
  Calendar, Briefcase, GraduationCap, DollarSign, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function HRISReport() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [subTab, setSubTab] = useState<'overview' | 'attendance' | 'department' | 'staffing'>('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/reports/comprehensive?section=hris');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || null);
      }
    } catch (error) {
      console.error('Error fetching HRIS report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); fetchData(); }, []);

  if (!mounted || loading || !data) {
    return (
      <HQLayout title="Laporan SDM / HRIS" subtitle="Analisis sumber daya manusia">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const { summary, departmentBreakdown, branchStaffing, attendanceTrend, leaveDistribution } = data;

  const exportToCSV = () => {
    const lines = ['Department,Headcount,Attendance,Productivity,Turnover'];
    departmentBreakdown.forEach((d: any) => {
      lines.push(`${d.department},${d.headcount},${d.attendance}%,${d.productivity},${d.turnover}%`);
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hris-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export laporan SDM berhasil');
  };

  const radarData = departmentBreakdown.map((d: any) => ({
    department: d.department.split(' / ')[0],
    attendance: d.attendance,
    productivity: d.productivity,
    retention: 100 - d.turnover,
  }));

  return (
    <HQLayout title="Laporan SDM / HRIS" subtitle="Analisis sumber daya manusia">
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { v: 'overview' as const, l: 'Overview', icon: Users },
              { v: 'attendance' as const, l: 'Kehadiran', icon: Clock },
              { v: 'department' as const, l: 'Departemen', icon: Briefcase },
              { v: 'staffing' as const, l: 'Staffing Cabang', icon: Building2 },
            ]).map(t => (
              <button key={t.v} onClick={() => setSubTab(t.v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${subTab === t.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <t.icon className="w-4 h-4" />{t.l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* ─── Overview Tab ─── */}
        {subTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold">{summary.totalEmployees}</p>
                <p className="text-teal-100 mt-1">Total Karyawan</p>
                <p className="text-sm text-teal-200 mt-1">{summary.activeEmployees} aktif</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <UserCheck className="w-8 h-8 opacity-80" />
                  <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{summary.avgAttendance}%</span>
                </div>
                <p className="text-3xl font-bold">{summary.avgAttendance}%</p>
                <p className="text-green-100 mt-1">Rata-rata Kehadiran</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold">{summary.avgProductivity}%</p>
                <p className="text-blue-100 mt-1">Avg Produktivitas</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <UserMinus className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold">{summary.turnoverRate}%</p>
                <p className="text-red-100 mt-1">Turnover Rate</p>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'Aktif', value: summary.activeEmployees, icon: UserCheck, color: 'text-green-600' },
                { label: 'Cuti', value: summary.onLeave, icon: Calendar, color: 'text-yellow-600' },
                { label: 'Resign', value: summary.resigned, icon: UserMinus, color: 'text-red-600' },
                { label: 'New Hire', value: summary.newHires, icon: Users, color: 'text-blue-600' },
                { label: 'Avg Gaji', value: formatCurrency(summary.avgSalary), icon: DollarSign, color: 'text-green-600' },
                { label: 'Training', value: `${summary.trainingCompletion}%`, icon: GraduationCap, color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <s.icon className="w-4 h-4" /><span className="text-sm">{s.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Distribusi Cuti</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leaveDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="count"
                        label={({ type, percentage }: any) => `${type} ${percentage}%`}
                      >
                        {leaveDistribution.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Performa Departemen</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="department" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Kehadiran" dataKey="attendance" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                      <Radar name="Produktivitas" dataKey="productivity" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                      <Radar name="Retention" dataKey="retention" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Total Payroll Summary */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Ringkasan Payroll</h3>
                  <p className="text-teal-100">
                    Total payroll bulanan {formatCurrency(summary.totalPayroll)} untuk {summary.activeEmployees} karyawan aktif.
                    Satisfaction score: {summary.satisfactionScore}/5.0
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{formatCurrency(summary.totalPayroll)}</p>
                    <p className="text-sm text-teal-200">Total Payroll</p>
                  </div>
                  <div className="w-px h-12 bg-white/30" />
                  <div className="text-center">
                    <p className="text-3xl font-bold">{summary.satisfactionScore}</p>
                    <p className="text-sm text-teal-200">Satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── Attendance Tab ─── */}
        {subTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Trend Kehadiran 6 Bulan</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[90, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="attendance" name="Kehadiran %" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="late" name="Terlambat %" stroke="#F59E0B" strokeWidth={2} />
                    <Line type="monotone" dataKey="absent" name="Absen %" stroke="#EF4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Kehadiran per Departemen</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[85, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="department" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, '']} />
                    <Bar dataKey="attendance" name="Kehadiran %" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ─── Department Tab ─── */}
        {subTab === 'department' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Detail per Departemen</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Departemen</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Headcount</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Kehadiran</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Produktivitas</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Turnover</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((d: any) => (
                    <tr key={d.department} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-teal-100 rounded-lg">
                            <Briefcase className="w-4 h-4 text-teal-600" />
                          </div>
                          <span className="font-medium text-gray-900">{d.department}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{d.headcount}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.attendance >= 96 ? 'bg-green-100 text-green-800' : d.attendance >= 94 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {d.attendance}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${d.productivity >= 85 ? 'bg-green-500' : d.productivity >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${d.productivity}%` }} />
                          </div>
                          <span className="text-sm text-gray-600">{d.productivity}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.turnover <= 2 ? 'bg-green-100 text-green-800' : d.turnover <= 4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {d.turnover}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Headcount per Departemen</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="headcount" name="Headcount" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ─── Staffing Tab ─── */}
        {subTab === 'staffing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Staffing per Cabang</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Cabang</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Headcount</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Posisi Kosong</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Avg Performa</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {branchStaffing.map((b: any) => (
                    <tr key={b.branch} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Building2 className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="font-medium text-gray-900">{b.branch}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{b.headcount}</td>
                      <td className="py-3 px-4 text-center">
                        {b.openPositions > 0 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            {b.openPositions} posisi
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Penuh</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${b.avgPerformance >= 85 ? 'bg-green-500' : b.avgPerformance >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${b.avgPerformance}%` }} />
                          </div>
                          <span className="text-sm text-gray-600">{b.avgPerformance}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.avgPerformance >= 85 ? 'bg-green-100 text-green-800' : b.avgPerformance >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {b.avgPerformance >= 85 ? 'Baik' : b.avgPerformance >= 80 ? 'Cukup' : 'Perlu Perhatian'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
