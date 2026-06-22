'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';

interface RequestCardProps {
  id: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  days: number;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  isManageable?: boolean;
}

export function RequestCard({
  id,
  employeeName,
  startDate,
  endDate,
  leaveType,
  reason,
  status,
  days,
  onApprove,
  onReject,
  onCancel,
  isManageable = false,
}: RequestCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{employeeName}</h3>
          <p className="mt-1 text-sm text-slate-500">{leaveType}</p>
        </div>
        <StatusBadge status={status} size="md" />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Période</p>
          <p className="mt-1 text-sm text-slate-700">
            {formatDate(startDate)} au {formatDate(endDate)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Jours</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{days} jour{days > 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ID</p>
            <p className="mt-1 text-sm font-medium text-slate-700">#{id}</p>
          </div>
        </div>

        {reason && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Motif</p>
            <p className="mt-1 text-sm text-slate-700">{reason}</p>
          </div>
        )}
      </div>

      {isManageable && (status === 'pending' || status === 'approved') && (
        <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
          {status === 'pending' && (
            <>
              <button
                onClick={onApprove}
                className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Approuver
              </button>
              <button
                onClick={onReject}
                className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                Refuser
              </button>
            </>
          )}
          {status === 'approved' && (
            <button
              onClick={onCancel}
              className="w-full rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Annuler l’approbation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
