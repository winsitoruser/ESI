import { NINE_BOX_GRID, NINE_BOX_LAYOUT, type NineBoxEmployee } from '@/lib/hris/nine-box-matrix';

interface Props {
  employees: NineBoxEmployee[];
  onSelect?: (emp: NineBoxEmployee) => void;
}

export default function NineBoxMatrix({ employees, onSelect }: Props) {
  const getCellEmployees = (quadrant: string) =>
    employees.filter(e => e.quadrant === quadrant);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="w-8 flex flex-col items-center justify-center text-[10px] text-gray-400 font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          POTENSIAL →
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-2">
            {NINE_BOX_LAYOUT.map((row, ri) =>
              row.map((quadrant) => {
                const cfg = NINE_BOX_GRID[quadrant];
                const cellEmps = getCellEmployees(quadrant);
                return (
                  <div key={quadrant} className={`rounded-xl p-3 min-h-[120px] ${cfg.color} opacity-95`}>
                    <p className="text-[10px] font-bold mb-1 opacity-90">{cfg.label}</p>
                    <p className="text-[9px] opacity-75 mb-2">{cfg.action}</p>
                    <div className="space-y-1">
                      {cellEmps.slice(0, 4).map(emp => (
                        <button
                          key={emp.employeeId}
                          onClick={() => onSelect?.(emp)}
                          className="block w-full text-left text-[10px] px-1.5 py-0.5 bg-white/20 rounded hover:bg-white/30 truncate"
                          title={`Perf: ${emp.performanceScore} | Pot: ${emp.potentialScore}`}
                        >
                          {emp.employeeName}
                        </button>
                      ))}
                      {cellEmps.length > 4 && (
                        <p className="text-[9px] opacity-75">+{cellEmps.length - 4} lainnya</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">KINERJA →</p>
        </div>
      </div>
    </div>
  );
}
