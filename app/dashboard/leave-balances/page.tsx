'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { LeaveBalanceCard } from '@/components/LeaveBalanceCard';
import { EmptyState } from '@/components/EmptyState';
import { extractArray } from '@/lib/frontend-utils';

interface Employee {
  id: number;
  full_name: string;
  employee_id: string;
  department: string;
}

interface LeaveBalance {
  id: number;
  vacation_type: string;
  vacation_type_code: string;
  year: number;
  annual_quota: number;
  accrued_days: number;
  used_days: number;
  remaining_days: number;
}

const currentYear = new Date().getFullYear();

export default function DashboardLeaveBalancesPage() {
  const { token, user, loading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState('');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [year, setYear] = useState(currentYear);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user || !token) return;
    if (user.role !== 'admin' && user.role !== 'manager') return;

    const loadEmployees = async () => {
      try {
        const res = await fetch('/api/employees', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Impossible de charger les employés');

        const data = await res.json();
        const safeEmployees = extractArray<Employee>(data);
        setEmployees(safeEmployees);
        if (safeEmployees.length > 0) {
          setSelectedEmployeeCode(safeEmployees[0].employee_id);
        }
      } catch (err) {
        console.error('Erreur de chargement des employés:', err);
        setError('Impossible de charger la liste des employés.');
      }
    };

    loadEmployees();
  }, [loading, token, user]);

  useEffect(() => {
    if (loading || !token || !user) return;

    const fetchBalances = async () => {
      setLoadingBalances(true);
      setError('');

      try {
        const params = new URLSearchParams({ year: String(year) });

        if (user.role === 'admin' || user.role === 'manager') {
          if (!selectedEmployeeCode) {
            setBalances([]);
            return;
          }
          params.set('employeeCode', selectedEmployeeCode);
        }

        const res = await fetch(`/api/leave-balances?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || 'Impossible de charger les soldes');
        }

        const data = await res.json();
        setBalances(extractArray<LeaveBalance>(data));
      } catch (err) {
        console.error('Erreur de chargement des soldes:', err);
        setError('Impossible de charger les soldes de congés.');
        setBalances([]);
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [loading, token, user, selectedEmployeeCode, year]);

  if (!loading && user && user.role !== 'admin' && user.role !== 'manager') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <h1 className="text-2xl font-semibold text-slate-900">Accès refusé</h1>
        <p className="mt-2 text-sm text-slate-500">Vous n’avez pas les droits nécessaires pour consulter cette page.</p>
      </div>
    );
  }

  const selectedEmployee = employees.find((employee) => employee.employee_id === selectedEmployeeCode);

  return (
    <div>
      <PageHeader
        title="Soldes de congés"
        description="Consultez les soldes par employé et par année."
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sélection</p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedEmployee ? `${selectedEmployee.full_name} (${selectedEmployee.employee_id})` : 'Aucun employé sélectionné'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:w-auto">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Année</span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-full min-w-[180px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((optionYear) => (
                  <option key={optionYear} value={optionYear}>{optionYear}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Employé</span>
              <select
                value={selectedEmployeeCode}
                onChange={(event) => setSelectedEmployeeCode(event.target.value)}
                className="w-full min-w-[180px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800"
              >
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.full_name} ({employee.employee_id})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      <Card>
        {loadingBalances ? (
          <div className="py-8 text-center text-sm text-slate-500">Chargement des soldes...</div>
        ) : balances.length === 0 ? (
          <EmptyState
            title="Aucun solde disponible pour cet employé."
            description="Les soldes de congé s’afficheront ici une fois chargés."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {balances.map((balance) => (
              <LeaveBalanceCard key={balance.id} balance={balance} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
