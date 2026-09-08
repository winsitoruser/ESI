import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function employeeInitials(name?: string | null) {
  if (!name || !String(name).trim()) return '?';
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

const SIZE: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-16 w-16 text-xl',
};

export type EmployeeAvatarProps = {
  name?: string | null;
  /** Prefer employees.photo_url; also accepts photoUrl / avatar aliases from APIs */
  photoUrl?: string | null;
  photo_url?: string | null;
  avatar?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  fallbackClassName?: string;
};

/**
 * Round employee photo with initials fallback (Humanify HRIS).
 * Uses employees.photo_url from master data when available.
 */
export default function EmployeeAvatar({
  name,
  photoUrl,
  photo_url,
  avatar,
  size = 'md',
  className,
  fallbackClassName,
}: EmployeeAvatarProps) {
  const src = (photoUrl || photo_url || avatar || '').trim() || undefined;

  return (
    <Avatar className={cn(SIZE[size], 'shrink-0 ring-2 ring-white shadow-sm', className)}>
      {src ? (
        <AvatarImage src={src} alt={name || 'Foto karyawan'} className="object-cover" />
      ) : null}
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br from-[var(--hf-brand-500,#6366f1)] to-[var(--hf-brand-700,#4338ca)] text-white font-bold',
          fallbackClassName,
        )}
      >
        {employeeInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export { EmployeeAvatar };
