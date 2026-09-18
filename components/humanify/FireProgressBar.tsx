import { useEffect, useState } from 'react';

type FireProgressBarProps = {
  value: number;
  className?: string;
  /** Track height in px */
  height?: number;
};

/**
 * Animated progress bar with a flickering flame tip at the leading edge.
 */
export default function FireProgressBar({ value, className = '', height = 10 }: FireProgressBarProps) {
  const target = Math.max(0, Math.min(100, Number(value) || 0));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(0);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWidth(target));
    });
    return () => cancelAnimationFrame(id);
  }, [target]);

  const tone =
    target >= 80 ? 'hf-fire-progress--ok' : target >= 50 ? 'hf-fire-progress--warn' : 'hf-fire-progress--danger';

  return (
    <div
      className={`hf-fire-progress ${tone} ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(target)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="hf-fire-progress__fill" style={{ width: `${width}%` }}>
        {width > 2 && (
          <span className="hf-fire-progress__flame" aria-hidden>
            <span className="hf-fire-progress__flame-core" />
            <span className="hf-fire-progress__flame-outer" />
          </span>
        )}
      </div>
    </div>
  );
}
