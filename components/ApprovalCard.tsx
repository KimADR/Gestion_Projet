import { Button } from './Button';

interface ApprovalCardProps {
  request: {
    id: number;
    full_name: string;
    vacation_type: string;
    start_date: string;
    end_date: string;
    duration_days: number;
    available_balance?: number | string;
    employee_code?: string;
    reason?: string;
    created_at?: string;
  };
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  loading?: boolean;
}

export function ApprovalCard({
  request,
  onApprove,
  onReject,
  loading = false,
}: ApprovalCardProps) {
  const balanceValue =
    typeof request.available_balance === 'number'
      ? request.available_balance
      : Number(request.available_balance ?? NaN);
  const hasBalance = Number.isFinite(balanceValue) && balanceValue >= 0;

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{request.full_name}</p>
          <p className="mt-1 text-sm text-slate-500">{request.vacation_type}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {request.duration_days} jour{request.duration_days > 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Dates</p>
          <p className="mt-1 font-medium text-slate-900">
            {formatDate(request.start_date)} — {formatDate(request.end_date)}
          </p>
        </div>
        {hasBalance && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Solde disponible</p>
            <p className="mt-1 font-medium text-slate-900">
              {balanceValue} jour{balanceValue > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {request.reason && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Motif</p>
            <p className="mt-1 text-sm text-slate-700">{request.reason}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {request.employee_code && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Code employé</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{request.employee_code}</p>
            </div>
          )}
          {request.created_at && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Date de création</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(request.created_at)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" size="sm" onClick={() => onApprove(request.id)} loading={loading}>
          Approuver
        </Button>
        <Button variant="outline" size="sm" onClick={() => onReject(request.id)} loading={loading}>
          Refuser
        </Button>
      </div>
    </div>
  );
}
