import React from 'react';

function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

/** Skeleton for summary stat cards (4 cards in a row) */
export function SummaryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-7 w-32" />
          <Pulse className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a chart area */
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 space-y-3`}>
      <div className="flex justify-between items-center">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-6 w-24 rounded-lg" />
      </div>
      <Pulse className={`${height} w-full rounded-lg`} />
    </div>
  );
}

/** Skeleton for a data table */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between">
        <Pulse className="h-4 w-40" />
        <Pulse className="h-8 w-32 rounded-lg" />
      </div>
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Pulse key={i} className="h-3 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Pulse key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-page finance skeleton combining cards + chart + table */
export function FinancePageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Pulse className="h-7 w-48" />
        <div className="flex gap-2">
          <Pulse className="h-9 w-28 rounded-lg" />
          <Pulse className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      <SummaryCardsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}

export default FinancePageSkeleton;
