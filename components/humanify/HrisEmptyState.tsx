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
    <div className="flex flex-col items-center justify-center rounded-[var(--hf-radius-xl)] border border-dashed border-[var(--hf-border)] bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white border border-[var(--hf-border)] shadow-[var(--hf-shadow)]">
        <Inbox className="h-5 w-5 text-[color:var(--hf-ink-faint)]" aria-hidden />
      </div>
      <div className="mb-2">
        <DataSourceBadge source={source} />
      </div>
      <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{title}</p>
      <p className="mt-1 max-w-md text-sm text-[color:var(--hf-ink-muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
