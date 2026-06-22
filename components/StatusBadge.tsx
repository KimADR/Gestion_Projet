interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'cancelled' | 'draft';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({
  status,
  className = '',
  size = 'md',
}: StatusBadgeProps) {
  const statusColorMap = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
    cancelled: 'bg-slate-100 text-slate-600 border border-slate-200',
    draft: 'bg-slate-50 text-slate-500 border border-slate-200',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    inactive: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px] font-semibold rounded-full',
    md: 'px-3 py-1 text-xs font-semibold rounded-full',
    lg: 'px-3.5 py-1.5 text-sm font-semibold rounded-full',
  };

  const labels: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Refusé',
    cancelled: 'Annulé',
    draft: 'Brouillon',
    active: 'Actif',
    inactive: 'Inactif',
  };

  return (
    <span className={`inline-flex items-center ${statusColorMap[status]} ${sizeClasses[size]} ${className}`}>
      {labels[status]}
    </span>
  );
}
