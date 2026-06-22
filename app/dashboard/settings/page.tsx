'use client';

import { useAuth } from '@/components/AuthContext';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';

export default function DashboardSettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Gérez votre profil et vos préférences de compte."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Profil</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{user?.fullName || 'Utilisateur inconnu'}</p>
              <p className="text-sm text-slate-500">{user?.email || 'Email non disponible'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rôle</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{user?.role || 'N/A'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sécurité</p>
              <p className="mt-1 text-sm text-slate-600">Gérez vos accès et vos préférences de sécurité.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">Aucune action de sécurité n’est disponible sur cette vue pour le moment.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
