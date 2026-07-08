import Image from 'next/image';
import Link from 'next/link';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

const LOGO_ASPECT = 1024 / 558;

type HumanifyLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** `mark` = icon only; `full` = wide render; `withText` = icon + brand name */
  variant?: 'full' | 'mark' | 'withText';
  href?: string;
  className?: string;
  priority?: boolean;
  /** Text color classes when variant is `withText` */
  textClassName?: string;
  subtitleClassName?: string;
};

const MARK_SIZES = { sm: 32, md: 40, lg: 48, xl: 64 } as const;
const FULL_HEIGHTS = { sm: 36, md: 44, lg: 56, xl: 72 } as const;

export function HumanifyLogo({
  size = 'md',
  variant = 'mark',
  href,
  className = '',
  priority,
  textClassName = 'font-bold text-gray-900 tracking-tight',
  subtitleClassName = 'text-xs text-gray-400 font-medium',
}: HumanifyLogoProps) {
  const alt = `${HUMANIFY_BRAND.name} — ${HUMANIFY_BRAND.tagline}`;
  const markSize = MARK_SIZES[size];

  const mark = (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-xl ${className}`}
      style={{ width: markSize, height: markSize }}
    >
      <Image
        src={HUMANIFY_BRAND.logoPath}
        alt={alt}
        fill
        priority={priority}
        className="object-cover object-[22%_center] scale-[2.4]"
        sizes={`${markSize}px`}
      />
    </span>
  );

  const image =
    variant === 'withText' ? (
      <span className={`inline-flex items-center gap-3 ${className}`}>
        {mark}
        <span>
          <p className={`leading-tight ${textClassName}`}>{HUMANIFY_BRAND.name}</p>
          <p className={`leading-tight mt-0.5 ${subtitleClassName}`}>{HUMANIFY_BRAND.tagline}</p>
        </span>
      </span>
    ) : variant === 'full' ? (
      <Image
        src={HUMANIFY_BRAND.logoPath}
        alt={alt}
        width={Math.round(FULL_HEIGHTS[size] * LOGO_ASPECT)}
        height={FULL_HEIGHTS[size]}
        priority={priority}
        className={`object-contain flex-shrink-0 rounded-xl ${className}`}
      />
    ) : (
      mark
    );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 hover:opacity-90 transition-opacity">
        {image}
      </Link>
    );
  }

  return image;
}
