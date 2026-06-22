'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { KPICard } from '@/components/Charts';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/components/AuthContext';
import { extractArray } from '@/lib/frontend-utils';

interface DashboardStats {
  totalEmployees?: number;
  pendingRequests?: number;
  approvedThisMonth?: number;
  availableDays?: number;
  usedDays?: number;
}

interface DashboardRequest {
  id: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  vacation_type?: string;
  full_name?: string;
  employee_name?: string;
  reason?: string;
  created_at?: string;
}

type AppStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'inactive' | 'draft';

function normalizeStatus(status?: string): AppStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'active':
      return 'active';
    case 'inactive':
      return 'inactive';
    case 'draft':
      return 'draft';
    case 'pending':
    default:
      return 'pending';
  }
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card variant="hover" className="cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <svg className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Card>
    </Link>
  );
}

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [allRequests, setAllRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const isManagement = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (isManagement) {
          const [employeesRes, requestsRes, approvalsRes] = await Promise.all([
            fetch('/api/employees', {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch('/api/vacation-requests', {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch('/api/approvals?status=approved&month=current', {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const employeesData = await employeesRes.json();
          const requestsData = await requestsRes.json();
          const approvalsData = await approvalsRes.json();

          const employees = extractArray<any>(employeesData);
          const requests = extractArray<DashboardRequest>(requestsData);
          const approvals = extractArray<any>(approvalsData);

          setAllRequests(requests);
          setStats({
            totalEmployees: employees.length,
            pendingRequests: requests.filter((request) => request.status === 'pending').length,
            approvedThisMonth: approvals.length,
          });
        } else {
          const [requestsRes, balanceRes] = await Promise.all([
            fetch('/api/vacation-requests', {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch('/api/leave-balances', {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const requestsData = await requestsRes.json();
          const balancesData = await balanceRes.json();
          const safeRequests = extractArray<DashboardRequest>(requestsData);
          const safeBalances = extractArray<any>(balancesData);

          const approvedRequests = safeRequests.filter((request) => request.status === 'approved');
          const pendingRequests = safeRequests.filter((request) => request.status === 'pending').length;
          const annualBalance = safeBalances.find(
            (item: any) => item.vacation_type_code === 'annual_leave'
          ) || null;

          const usedDays = approvedRequests.reduce((sum: number, request: DashboardRequest) => {
            const value = Number(request.duration_days || 0);
            return sum + (Number.isFinite(value) ? value : 0);
          }, 0);

          setAllRequests(safeRequests);
          setStats({
            availableDays: annualBalance ? Number(annualBalance.remaining_days || 0) : 0,
            usedDays,
            pendingRequests,
            approvedThisMonth: approvedRequests.length,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchStats();
    }
  }, [user, token, isManagement]);

  const upcomingRequests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...allRequests]
      .filter((request) => request.status === 'approved' || request.status === 'pending')
      .filter((request) => request.start_date && new Date(request.start_date) >= today)
      .sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime())
      .slice(0, 4);
  }, [allRequests]);

  const recentRequests = useMemo(() => {
    return [...allRequests]
      .sort((a, b) => new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime())
      .slice(0, 4);
  }, [allRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
          <p className="mt-4 text-sm text-slate-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de votre activité et des éléments à suivre."
      />

      {isManagement ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KPICard
              title="Employés"
              value={stats.totalEmployees || 0}
              gradient="primary"
              icon={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3a6 6 0 016-6h6a6 6 0 016 6v0M9 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />

            <KPICard
              title="Demandes en attente"
              value={stats.pendingRequests || 0}
              gradient="warning"
              icon={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            <KPICard
              title="Approuvées ce mois"
              value={typeof stats.approvedThisMonth === 'number' ? stats.approvedThisMonth : '—'}
              gradient="success"
              icon={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Demandes récentes" subtitle="Les dernières demandes disponibles dans le système">
              {recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <div>
                        <p className="font-medium text-slate-900">{request.full_name || request.employee_name || `Demande #${request.id}`}</p>
                        <p className="mt-1 text-sm text-slate-500">{request.vacation_type || 'Demande de congé'}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={normalizeStatus(request.status)} size="sm" />
                        <p className="mt-2 text-xs text-slate-500">{formatDate(request.created_at || request.start_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucune demande récente"
                  description="Les demandes récentes apparaitront ici une fois disponibles."
                />
              )}
            </Card>

            <Card title="Absences à venir" subtitle="Périodes déjà planifiées ou en cours de validation">
              {upcomingRequests.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">{request.full_name || request.employee_name || `Demande #${request.id}`}</p>
                        <StatusBadge status={normalizeStatus(request.status)} size="sm" />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(request.start_date)} — {formatDate(request.end_date)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucune absence à venir"
                  description="Les prochaines absences apparaîtront ici automatiquement."
                />
              )}
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KPICard
              title="Jours disponibles"
              value={stats.availableDays ?? 0}
              unit="jours"
              gradient="primary"
              icon={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />

            <KPICard
              title="Demandes approuvées"
              value={typeof stats.approvedThisMonth === 'number' ? stats.approvedThisMonth : 0}
              gradient="success"
              icon={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          <Card title="Résumé personnel" subtitle="Consommation et suivi de vos congés">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Jours utilisés</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.usedDays ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Demandes en attente</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.pendingRequests ?? 0}</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Dernières demandes" subtitle="Historique de vos demandes récentes">
              {recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <div>
                        <p className="font-medium text-slate-900">{request.vacation_type || 'Demande'}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(request.start_date)}</p>
                      </div>
                      <StatusBadge status={normalizeStatus(request.status)} size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucune demande récente"
                  description="Vos demandes apparaîtront ici une fois soumises."
                />
              )}
            </Card>

            <Card title="Absences à venir" subtitle="Vos prochaines périodes de congé">
              {upcomingRequests.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">{request.vacation_type || 'Congé'}</p>
                        <StatusBadge status={normalizeStatus(request.status)} size="sm" />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(request.start_date)} — {formatDate(request.end_date)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucune absence à venir"
                  description="Les prochaines absences apparaîtront ici automatiquement."
                />
              )}
            </Card>
          </div>
        </>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Actions rapides</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <QuickActionCard
            href={isManagement ? '/dashboard/approvals' : '/dashboard/requests'}
            title={isManagement ? 'Examiner les demandes' : 'Nouvelle demande'}
            description={
              isManagement
                ? 'Consultez et validez les demandes en attente.'
                : 'Soumettez une nouvelle demande de congé.'
            }
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isManagement ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} />
              </svg>
            }
          />

          <QuickActionCard
            href="/dashboard/calendar"
            title="Voir le calendrier"
            description="Consultez les disponibilités et les absences prévues."
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      </section>
    </div>
  );
}
