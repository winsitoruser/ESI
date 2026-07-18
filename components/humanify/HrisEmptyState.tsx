import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import type { HrisDataSource } from '@/lib/hris/data-source';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';

export default function HrisEmptyState({
  title = 'Belum ada data',
  description = 'Data akan muncul setelah Anda menambahkan atau mengimpor catatan pertama.',
  source = 'empty',
  action,
}: {
  title?: string;
  description?: string;
  source?: HrisDataSource;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
      <Inbox className="mb-3 h-8 w-8 text-slate-400" aria-hidden />
      <div className="mb-2">
        <DataSourceBadge source={source} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
