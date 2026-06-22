interface LeaveBalanceCardProps {
  balance: {
    id: number;
    vacation_type: string;
    annual_quota: number;
    accrued_days: number;
    used_days: number;
    remaining_days: number;
  };
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const annualQuota = Number(balance.annual_quota || 0);
  const usedDays = Number(balance.used_days || 0);
  const remainingDays = Number(balance.remaining_days || 0);
  const usedPercent = annualQuota > 0 ? Math.min(100, Math.max(0, (usedDays / annualQuota) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{balance.vacation_type}</p>
          <p className="mt-1 text-sm text-slate-500">Quota annuel</p>
        </div>
        <span className="text-sm font-semibold text-slate-900">{remainingDays} jours restants</span>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-300"
          style={{ width: `${usedPercent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{usedPercent.toFixed(0)}% utilisé</span>
        <span>{annualQuota} au total</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Quota</p>
          <p className="mt-1 font-semibold text-slate-900">{annualQuota}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Utilisés</p>
          <p className="mt-1 font-semibold text-slate-900">{usedDays}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Restants</p>
          <p className="mt-1 font-semibold text-slate-900">{remainingDays}</p>
        </div>
      </div>
    </div>
  );
}
