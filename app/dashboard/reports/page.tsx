'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { extractArray } from '@/lib/frontend-utils';

interface ReportStats {
  employees: number;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
}

export default function DashboardReportsPage() {
  const { token, user, loading } = useAuth();
  const [stats, setStats] = useState<ReportStats>({
    employees: 0,
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
  });
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'admin' && user.role !== 'manager') {
      setPageLoading(false);
      return;
    }

    const load = async () => {
      if (!token) return;
      try {
        const [employeesRes, requestsRes] = await Promise.all([
          fetch('/api/employees', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/vacation-requests', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const employeesData = await employeesRes.json();
        const requestsData = await requestsRes.json();

        const safeEmployees = extractArray<any>(employeesData);
        const safeRequests = extractArray<any>(requestsData);

        const approvedRequests = safeRequests.filter(
          (item: any) => item && item.status === 'approved'
        ).length;
        const pendingRequests = safeRequests.filter(
          (item: any) => item && item.status === 'pending'
        ).length;

        setStats({
          employees: safeEmployees.length,
          totalRequests: safeRequests.length,
          approvedRequests,
          pendingRequests,
        });
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setPageLoading(false);
      }
    };

    load();
  }, [token, loading, user]);

  if (!loading && !pageLoading && user && user.role !== 'admin' && user.role !== 'manager') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <h1 className="text-2xl font-semibold text-slate-900">Accès refusé</h1>
        <p className="mt-2 text-sm text-slate-500">Vous n’avez pas les droits nécessaires pour consulter cette page.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Rapports"
        description="Vue synthétique des indicateurs RH."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employés</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : stats.employees}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Demandes totales</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : stats.totalRequests}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Approuvées</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : stats.approvedRequests}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">En attente</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : stats.pendingRequests}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <p className="text-sm text-slate-600">Ces indicateurs sont calculés à partir des données actuelles de l’API.</p>
      </Card>
    </div>
  );
}
