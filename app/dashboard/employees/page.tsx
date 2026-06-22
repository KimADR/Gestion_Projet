'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { InputField, SelectField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import { EmployeeCard } from '@/components/EmployeeCard';
import { EmptyState } from '@/components/EmptyState';
import { extractArray } from '@/lib/frontend-utils';

interface Employee {
  id: number;
  full_name: string;
  email: string;
  employee_id: string;
  position: string;
  department: string;
  hired_date: string;
  is_active: boolean;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

const initialForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  departmentId: '',
  position: '',
  hireDate: '',
};

export default function DashboardEmployeesPage() {
  const { token, user, loading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [pageLoading, setPageLoading] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'admin' && user.role !== 'manager') {
      setPageLoading(false);
      return;
    }

    const load = async () => {
      if (!token) return;
      try {
        const [empRes, deptRes] = await Promise.all([
          fetch('/api/employees', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/departments', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const employeesData = await empRes.json();
        const departmentsData = await deptRes.json();

        setEmployees(extractArray<Employee>(employeesData));
        setDepartments(extractArray<Department>(departmentsData));
      } catch (error) {
        console.error('Failed to load employees:', error);
        setEmployees([]);
        setDepartments([]);
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!token) {
      setFormError('Authentification requise.');
      return;
    }

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeCode: formData.employeeCode,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          departmentId: Number(formData.departmentId),
          position: formData.position,
          hireDate: formData.hireDate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFormError(data.error || 'Impossible de créer l’employé.');
        return;
      }

      setShowForm(false);
      setFormData(initialForm);
      setEmployees((current) => [data, ...current]);
    } catch (error) {
      setFormError('Impossible de créer l’employé.');
      console.error(error);
    }
  };

  return (
    <div>
      <PageHeader
        title="Employés"
        description="Gérez les fiches collaborateurs et les départements."
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Ajouter un employé
          </Button>
        }
      />

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError('');
          setFormData(initialForm);
        }}
        title="Nouvel employé"
        subtitle="Renseignez les informations de la personne"
        size="lg"
        footer={
          <>
            <Button variant="subtle" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" form="employee-form">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{formError}</div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Prénom"
              required
              value={formData.firstName}
              onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
            />
            <InputField
              label="Nom"
              required
              value={formData.lastName}
              onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
            />
            <InputField
              label="Code employé"
              required
              value={formData.employeeCode}
              onChange={(event) => setFormData({ ...formData, employeeCode: event.target.value })}
            />
            <InputField
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            />
            <InputField
              label="Mot de passe"
              type="password"
              required
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            />
            <InputField
              label="Poste"
              required
              value={formData.position}
              onChange={(event) => setFormData({ ...formData, position: event.target.value })}
            />
            <InputField
              label="Date d’embauche"
              type="date"
              required
              value={formData.hireDate}
              onChange={(event) => setFormData({ ...formData, hireDate: event.target.value })}
            />
            <SelectField
              label="Département"
              required
              value={formData.departmentId}
              onChange={(event) => setFormData({ ...formData, departmentId: event.target.value })}
              options={departments.map((department) => ({
                value: String(department.id),
                label: department.name,
              }))}
            />
          </div>
        </form>
      </Modal>

      <Card>
        {pageLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Chargement des employés...</div>
        ) : employees.length === 0 ? (
          <EmptyState
            title="Aucun employé trouvé."
            description="Les collaborateurs apparaîtront ici une fois ajoutés."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
