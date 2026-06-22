import { StatusBadge } from './StatusBadge';

interface EmployeeCardProps {
  employee: {
    id: number;
    full_name: string;
    email?: string;
    employee_id: string;
    position: string;
    department: string;
    hired_date?: string;
    is_active?: boolean;
  };
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const hireDate = employee.hired_date
    ? new Date(employee.hired_date).toLocaleDateString('fr-FR')
    : 'Non disponible';

  const status = employee.is_active === false ? 'inactive' : 'active';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{employee.full_name}</p>
          <p className="mt-1 text-sm text-slate-500">{employee.position || 'Poste non renseigné'}</p>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Code employé</p>
          <p className="mt-1 font-medium text-slate-900">{employee.employee_id || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Département</p>
          <p className="mt-1 font-medium text-slate-900">{employee.department || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Poste</p>
          <p className="mt-1 font-medium text-slate-900">{employee.position || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Date d’embauche</p>
          <p className="mt-1 font-medium text-slate-900">{hireDate}</p>
        </div>
      </div>

      {employee.email && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Email</p>
          <p className="mt-1 text-sm text-slate-700">{employee.email}</p>
        </div>
      )}
    </div>
  );
}
