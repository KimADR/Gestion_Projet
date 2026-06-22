'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { RequestCard } from '@/components/RequestCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { InputField, SelectField, TextAreaField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import { extractArray } from '@/lib/frontend-utils';

interface VacationType {
  id: number;
  name: string;
  code: string;
  description?: string;
}

interface VacationRequest {
  id: number;
  vacation_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: string;
  created_at: string;
  reason?: string;
  employee_name?: string;
}

const initialForm = {
  vacationTypeId: '',
  halfDayType: 'none',
  startDate: '',
  endDate: '',
  reason: '',
};

export default function DashboardRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [types, setTypes] = useState<VacationType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const safeRequests = extractArray<VacationRequest>(requests);
  const safeTypes = extractArray<VacationType>(types);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const [requestsRes, typesRes] = await Promise.all([
          fetch('/api/vacation-requests', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/vacation-types', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const requestsData = await requestsRes.json();
        const typesData = await typesRes.json();

        setRequests(extractArray<any>(requestsData));
        setTypes(extractArray<any>(typesData));
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        setRequests([]);
        setTypes([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!token) {
      setFormError('Authentification requise.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/vacation-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vacationTypeId: Number(formData.vacationTypeId),
          startDate: formData.startDate,
          endDate: formData.endDate,
          halfDayType: formData.halfDayType,
          reason: formData.reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFormError(data.error || 'Impossible de créer la demande.');
        return;
      }

      setShowModal(false);
      setFormData(initialForm);
      setRequests((current) => [data, ...current]);
    } catch (error) {
      setFormError('Impossible de soumettre la demande.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const statusMap: { [key: string]: 'pending' | 'approved' | 'rejected' | 'cancelled' } = {
    en_attente: 'pending',
    pending: 'pending',
    approuvé: 'approved',
    approved: 'approved',
    refusé: 'rejected',
    rejected: 'rejected',
    annulé: 'cancelled',
    cancelled: 'cancelled',
    annule: 'cancelled',
  };

  return (
    <div>
      <PageHeader
        title="Demandes de congé"
        description="Créez, consultez et gérez vos demandes de congé."
        actions={
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Nouvelle demande
          </Button>
        }
      />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormError('');
          setFormData(initialForm);
        }}
        title="Nouvelle demande de congé"
        subtitle="Remplissez les informations ci-dessous"
        size="lg"
        footer={
          <>
            <Button variant="subtle" onClick={() => setShowModal(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" form="request-form" loading={submitting}>
              Soumettre
            </Button>
          </>
        }
      >
        <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Type de congé"
              required
              value={formData.vacationTypeId}
              onChange={(e) => setFormData({ ...formData, vacationTypeId: e.target.value })}
              options={safeTypes
                .filter((type) => type && type.code !== 'annual_leave_half')
                .map((type) => ({ value: String(type.id), label: type.name }))}
            />

            <InputField
              label="Date de début"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />

            <InputField
              label="Date de fin"
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />

            <SelectField
              label="Demi-journée"
              value={formData.halfDayType}
              onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value })}
              options={[
                { value: 'none', label: 'Aucune' },
                { value: 'first', label: 'Première journée' },
                { value: 'last', label: 'Dernière journée' },
                { value: 'both', label: 'Première et dernière' },
              ]}
              hint="Option pour les demandes de congés annuels"
            />
          </div>

          <TextAreaField
            label="Motif (optionnel)"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Décrivez brièvement votre demande..."
          />
        </form>
      </Modal>

      {loading ? (
        <Card className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-500">Chargement des demandes...</p>
        </Card>
      ) : safeRequests.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="Aucune demande de congé"
          description="Créez votre première demande de congé pour commencer."
          action={
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Créer une demande
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {safeRequests.map((request) => {
            const normalizedStatus = statusMap[String(request?.status || '').toLowerCase()] || 'pending';
            return (
              <RequestCard
                key={request.id}
                id={request.id}
                employeeName={request.employee_name || 'Vous'}
                startDate={request.start_date}
                endDate={request.end_date}
                leaveType={request.vacation_type}
                days={request.duration_days}
                reason={request.reason}
                status={normalizedStatus}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
