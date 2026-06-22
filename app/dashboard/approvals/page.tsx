'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { ApprovalCard } from '@/components/ApprovalCard';
import { EmptyState } from '@/components/EmptyState';
import { extractArray } from '@/lib/frontend-utils';

interface ApprovalRequest {
  id: number;
  full_name: string;
  vacation_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  available_balance?: number;
}

export default function DashboardApprovalsPage() {
  const { token, user, loading } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ id: number; mode: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'admin' && user.role !== 'manager') {
      setLoadingRequests(false);
      return;
    }

    const load = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/approvals', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRequests(extractArray<ApprovalRequest>(data));
      } catch (err) {
        console.error('Failed to load approvals:', err);
        setRequests([]);
        setError('Impossible de charger les demandes d’approbation.');
      } finally {
        setLoadingRequests(false);
      }
    };

    load();
  }, [token, loading, user]);

  const closeModal = () => {
    setPendingAction(null);
    setRejectionReason('');
  };

  const handleAction = async (id: number, action: 'approve' | 'reject', reason?: string) => {
    if (!token) return;

    setProcessingId(id);
    setError('');

    try {
      const body = {
        vacationRequestId: id,
        approved: action === 'approve',
        comments: action === 'approve' ? 'Approuvé' : null,
        rejectionReason: action === 'reject' ? reason?.trim() || 'Aucun motif précisé' : null,
      };

      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || 'Impossible de mettre à jour la demande.';
        setError(errorMessage);
        return;
      }

      setRequests((current) => current.filter((item) => item.id !== id));
      closeModal();
    } catch (err) {
      console.error('Approval action failed:', err);
      setError('Impossible de mettre à jour la demande.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!loading && user && user.role !== 'admin' && user.role !== 'manager') {
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
        title="Approbations"
        description="Consultez et validez les demandes de congé en attente."
      />

      <Card>
        {error && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {loadingRequests ? (
          <div className="py-8 text-center text-sm text-slate-500">Chargement des demandes...</div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="Aucune demande en attente."
            description="Les nouvelles demandes apparaîtront ici."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => (
              <ApprovalCard
                key={request.id}
                request={request}
                loading={processingId === request.id}
                onApprove={() => setPendingAction({ id: request.id, mode: 'approve' })}
                onReject={() => setPendingAction({ id: request.id, mode: 'reject' })}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!pendingAction}
        onClose={closeModal}
        title={pendingAction?.mode === 'approve' ? 'Confirmer l’approbation' : 'Refuser la demande'}
        size="md"
      >
        {pendingAction && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {pendingAction.mode === 'approve'
                ? 'Voulez-vous vraiment approuver cette demande ?'
                : 'Veuillez préciser le motif du refus avant de valider.'}
            </p>
            {pendingAction.mode === 'reject' && (
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-slate-400"
                placeholder="Motif du refus"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeModal}>
                Annuler
              </Button>
              <Button
                variant={pendingAction.mode === 'approve' ? 'primary' : 'outline'}
                size="sm"
                loading={processingId === pendingAction.id}
                onClick={() =>
                  pendingAction.mode === 'approve'
                    ? handleAction(pendingAction.id, 'approve')
                    : handleAction(pendingAction.id, 'reject', rejectionReason)
                }
              >
                {pendingAction.mode === 'approve' ? 'Confirmer' : 'Refuser'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
