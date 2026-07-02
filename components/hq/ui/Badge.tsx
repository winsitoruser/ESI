import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dot?: boolean;
  rounded?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-blue-100 text-blue-800',
  secondary: 'bg-purple-100 text-purple-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-cyan-100 text-cyan-800'
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm'
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-blue-500',
  secondary: 'bg-purple-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-cyan-500'
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  dot = false,
  rounded = true,
  className = ''
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {icon}
      {children}
    </span>
  );
}

// Status Badge with predefined status mappings
interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
}

const statusMappings: Record<string, { variant: BadgeVariant; label: string }> = {
  // General
  active: { variant: 'success', label: 'Aktif' },
  inactive: { variant: 'default', label: 'Tidak Aktif' },
  pending: { variant: 'warning', label: 'Menunggu' },
  
  // Requisition
  draft: { variant: 'default', label: 'Draf' },
  submitted: { variant: 'primary', label: 'Diajukan' },
  under_review: { variant: 'warning', label: 'Dalam Peninjauan' },
  approved: { variant: 'success', label: 'Disetujui' },
  partially_approved: { variant: 'info', label: 'Disetujui Sebagian' },
  rejected: { variant: 'danger', label: 'Ditolak' },
  processing: { variant: 'secondary', label: 'Diproses' },
  ready_to_ship: { variant: 'info', label: 'Siap Kirim' },
  in_transit: { variant: 'primary', label: 'Dalam Pengiriman' },
  delivered: { variant: 'success', label: 'Terkirim' },
  completed: { variant: 'success', label: 'Selesai' },
  cancelled: { variant: 'default', label: 'Dibatalkan' },

  // Branch status
  online: { variant: 'success', label: 'Online' },
  offline: { variant: 'danger', label: 'Offline' },
  warning: { variant: 'warning', label: 'Peringatan' },

  // Priority
  low: { variant: 'default', label: 'Rendah' },
  normal: { variant: 'primary', label: 'Normal' },
  high: { variant: 'warning', label: 'Tinggi' },
  urgent: { variant: 'danger', label: 'Mendesak' },

  // Boolean
  yes: { variant: 'success', label: 'Ya' },
  no: { variant: 'danger', label: 'Tidak' },
  locked: { variant: 'warning', label: 'Terkunci' },
  unlocked: { variant: 'success', label: 'Tidak Terkunci' }
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  if (!status) {
    return <Badge variant="default" size={size} dot>-</Badge>;
  }
  const mapping = statusMappings[status.toLowerCase()] || { variant: 'default' as BadgeVariant, label: status };
  return (
    <Badge variant={mapping.variant} size={size} dot>
      {mapping.label}
    </Badge>
  );
}

// Priority Badge
interface PriorityBadgeProps {
  priority: 'low' | 'normal' | 'high' | 'urgent';
  size?: BadgeSize;
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const mapping = statusMappings[priority];
  return (
    <Badge variant={mapping.variant} size={size}>
      {priority.toUpperCase()}
    </Badge>
  );
}
