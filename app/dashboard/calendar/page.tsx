'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/components/AuthContext';
import { extractArray } from '@/lib/frontend-utils';

interface VacationEvent {
  full_name: string;
  start_date: string;
  end_date: string;
  vacation_type: string;
  color?: string;
  excel_code?: string;
}

export default function CalendarPage() {
  const { token } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<VacationEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VacationEvent | null>(null);
  const [filter, setFilter] = useState<'all' | 'leave' | 'sick' | 'permission'>('all');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/vacation-requests?status=approved', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const eventsData = await res.json();
        setEvents(extractArray<VacationEvent>(eventsData));
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setEvents([]);
      }
    };

    if (token) {
      fetchEvents();
    }
  }, [token]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return (day + 6) % 7;
  };

  const getEventCategory = (event: VacationEvent) => {
    const type = (event.vacation_type || '').toLowerCase();

    if (type.includes('permission') || type.includes('perm')) {
      return 'permission';
    }

    if (type.includes('sick') || type.includes('maladie') || type.includes('absence') || type.includes('abs')) {
      return 'sick';
    }

    return 'leave';
  };

  const getEventColors = (event: VacationEvent) => {
    const category = getEventCategory(event);

    if (category === 'permission') {
      return {
        background: '#F8FAFC',
        border: '#94A3B8',
        text: '#0F172A',
      };
    }

    if (category === 'sick') {
      return {
        background: '#F8FAFC',
        border: '#64748B',
        text: '#0F172A',
      };
    }

    return {
      background: '#EEF2FF',
      border: '#1E3A8A',
      text: '#0F172A',
    };
  };

  const isEventOnDay = (day: number, sourceEvents: VacationEvent[] = filteredEvents) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return sourceEvents.filter((event) => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      return date >= start && date <= end;
    });
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const days = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => getEventCategory(event) === filter);
  }, [events, filter]);

  const visibleEvents = filteredEvents.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendrier"
        description="Consultez les absences approuvées par période."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-[#0B1F33] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('leave')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                filter === 'leave' ? 'bg-[#0B1F33] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Congé annuel
            </button>
            <button
              onClick={() => setFilter('sick')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                filter === 'sick' ? 'bg-[#0B1F33] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Repos maladie
            </button>
            <button
              onClick={() => setFilter('permission')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                filter === 'permission' ? 'bg-[#0B1F33] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Permission
            </button>
          </div>
        }
      />

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            ← Précédent
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{monthName}</h2>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Suivant →
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0B1F33]"></span> Congé annuel</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500"></span> Repos maladie</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300"></span> Permission</span>
          </div>
          <span className="text-xs text-slate-500">{visibleEvents} élément(s) affiché(s)</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
              {day}
            </div>
          ))}

          {days.map((day, index) => (
            <div key={index} className="min-h-28 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {day && (
                <>
                  <p className="mb-1 text-sm font-semibold text-slate-700">{day}</p>
                  <div className="space-y-1">
                    {isEventOnDay(day).slice(0, 2).map((event, idx) => {
                      const colors = getEventColors(event);
                      const displayCode = event.excel_code ? ` (${event.excel_code})` : '';

                      return (
                        <button
                          key={`${event.full_name}-${idx}`}
                          onClick={() => setSelectedEvent(event)}
                          className="w-full truncate rounded-lg px-2 py-1 text-left text-[11px] font-semibold"
                          style={{
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderLeft: `3px solid ${colors.border}`,
                          }}
                        >
                          {event.full_name.split(' ')[0]}{displayCode}
                        </button>
                      );
                    })}
                    {isEventOnDay(day).length > 2 && (
                      <p className="px-1 text-[11px] text-slate-400">+{isEventOnDay(day).length - 2} de plus</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Détail du congé"
        size="md"
      >
        {selectedEvent && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employé</p>
              <p className="mt-1 text-sm text-slate-900">{selectedEvent.full_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</p>
              <p className="mt-1 text-sm text-slate-900">{selectedEvent.vacation_type}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Période</p>
              <p className="mt-1 text-sm text-slate-900">
                {new Date(selectedEvent.start_date).toLocaleDateString('fr-FR')} — {new Date(selectedEvent.end_date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
