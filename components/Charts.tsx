'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  name: string;
  [key: string]: any;
}

interface ChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  colors?: string[];
}

// Line Chart for trends
export function TrendChart({ data, title, height = 300, colors = ['#0f172a', '#0ea5a6'] }: ChartProps) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {title && <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              boxShadow: '0 6px 16px -10px rgba(15, 23, 42, 0.18)',
            }}
          />
          <Legend />
          {Object.keys(data[0] || {})
            .filter((key) => key !== 'name')
            .map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[idx % colors.length], r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bar Chart for comparisons
export function BarChartComponent({
  data,
  title,
  height = 300,
  colors = ['#0f172a'],
}: ChartProps) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {title && <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              boxShadow: '0 6px 16px -10px rgba(15, 23, 42, 0.18)',
            }}
          />
          <Legend />
          {Object.keys(data[0] || {})
            .filter((key) => key !== 'name')
            .map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[idx % colors.length]}
                radius={[6, 6, 0, 0]}
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Pie Chart for distribution
export function PieChartComponent({
  data,
  title,
  height = 300,
  colors = ['#0f172a', '#0ea5a6', '#64748b', '#d97706', '#dc2626'],
}: ChartProps) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {title && <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              boxShadow: '0 6px 16px -10px rgba(15, 23, 42, 0.18)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// KPI Card for key metrics
interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    positive: boolean;
  };
  icon?: React.ReactNode;
  gradient?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
}

export function KPICard({
  title,
  value,
  unit,
  trend,
  icon,
  gradient = 'primary',
}: KPICardProps) {
  const accentMap = {
    primary: 'bg-slate-900 text-white',
    secondary: 'bg-cyan-600 text-white',
    accent: 'bg-slate-100 text-slate-900',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <div className="mt-2 flex items-end gap-1">
            <h3 className="text-3xl font-semibold text-slate-900">{value}</h3>
            {unit && <span className="pb-1 text-sm text-slate-500">{unit}</span>}
          </div>
          {trend && (
            <p className={`mt-2 text-sm font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs. dernier mois
            </p>
          )}
        </div>
        {icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentMap[gradient]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
