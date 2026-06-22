-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vacation types table
CREATE TABLE IF NOT EXISTS vacation_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  requires_approval BOOLEAN DEFAULT true,
  color VARCHAR(7) DEFAULT '#2563eb',
  excel_code VARCHAR(10),
  display_order INT DEFAULT 999,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  department_id INT NOT NULL REFERENCES departments(id),
  position VARCHAR(255) NOT NULL,
  hired_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_vacation_days INT DEFAULT 25,
  used_vacation_days INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vacation requests table
CREATE TABLE IF NOT EXISTS vacation_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  vacation_type_id INT NOT NULL REFERENCES vacation_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(5,2) NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  vacation_request_id INT NOT NULL UNIQUE REFERENCES vacation_requests(id) ON DELETE CASCADE,
  approver_id INT REFERENCES users(id) ON DELETE SET NULL,
  approved BOOLEAN,
  comments TEXT,
  approval_reason TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMP,
  is_cancelled BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Public holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  country_code VARCHAR(2) DEFAULT 'MG',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave balances table (new system for managing vacation days per type and year)
CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  vacation_type_id INT NOT NULL REFERENCES vacation_types(id),
  year INT NOT NULL,
  annual_quota DECIMAL(10,2) DEFAULT 0,
  accrued_days DECIMAL(10,2) DEFAULT 0,
  used_days DECIMAL(10,2) DEFAULT 0,
  remaining_days DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, vacation_type_id, year)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_employee_id ON vacation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_start_date ON vacation_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_approvals_vacation_request_id ON approvals(vacation_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, year);

-- Insert vacation types (TekFutura system)
INSERT INTO vacation_types (name, code, description, requires_approval, color, excel_code, display_order) VALUES
('Congé Annuel', 'annual_leave', 'Congé annuel payé - 22 jours', true, '#3B82F6', 'c', 1),
('Demi-Journée Annuel', 'annual_leave_half', 'Demi-journée congé annuel - 0.5 jour', true, '#60A5FA', '-', 2),
('Repos Maladie', 'sick_leave', 'Congé maladie payé - 10.98 jours', false, '#EF4444', 'm', 3),
('Permission', 'permission', 'Permission - 10.98 jours', false, '#10B981', 'P', 4),
('Congé Non-Payé', 'unpaid_leave', 'Congé sans salaire', true, '#9CA3AF', 'U', 5),
('Congé Maternité', 'maternity_leave', 'Congé de maternité', true, '#EC4899', 'MAT', 6)
ON CONFLICT (code) DO NOTHING;

-- Insert departments
INSERT INTO departments (name, code) VALUES
('Nord', 'NORD'),
('Sud', 'SUD'),
('Fonction Support', 'FTU'),
('Direction Qualité et Opération', 'DQO'),
('Direction Commerciale et Partenariats', 'DCP'),
('Direction Technique', 'DT')
ON CONFLICT (code) DO NOTHING;
