export default function CustomerStatisticsCard({ stats }: { stats?: any }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Statistik Pelanggan</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{stats?.total || 0}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          <div className="text-xs text-gray-500">Aktif</div>
        </div>
      </div>
    </div>
  );
}
