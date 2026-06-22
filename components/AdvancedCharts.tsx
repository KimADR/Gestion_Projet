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
  AreaChart,
  Area,
} from 'recharts';
import { Card } from './Card';

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

interface AdvancedChartProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  height?: number;
  colors?: string[];
}

export function AdvancedTrendChart({
  title,
  description,
  data,
  height = 300,
  colors = ['#0052cc', '#06b6d4'],
}: AdvancedChartProps & { dataKeys?: string[] }) {
  const dataKeys = ['requests', 'approved'];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-secondary-light mt-1">{description}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[1]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[1]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#1f2937' }}
            cursor={{ stroke: colors[0], strokeWidth: 2 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke={colors[0]}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRequests)"
            name="Total Requests"
            isAnimationActive={true}
          />
          <Area
            type="monotone"
            dataKey="approved"
            stroke={colors[1]}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorApproved)"
            name="Approved"
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function AdvancedBarChart({
  title,
  description,
  data,
  height = 300,
  colors = ['#ff9500'],
  dataKey = 'value',
}: AdvancedChartProps & { dataKey?: string }) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-secondary-light mt-1">{description}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#1f2937' }}
            cursor={{ fill: 'rgba(0, 82, 204, 0.1)' }}
          />
          <Bar
            dataKey={dataKey}
            fill={colors[0]}
            radius={[8, 8, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface PieDataPoint {
  name: string;
  value: number;
}

export function AdvancedPieChart({
  title,
  description,
  data,
  height = 300,
  colors = ['#10b981', '#f59e0b', '#ef4444'],
}: {
  title: string;
  description?: string;
  data: PieDataPoint[];
  height?: number;
  colors?: string[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-secondary-light mt-1">{description}</p>}
      </div>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: '#1f2937' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-3 min-w-max">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-secondary-light">
                  {item.value} ({Math.round((item.value / total) * 100)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function LineChartWithMultipleLines({
  title,
  description,
  data,
  height = 300,
  dataKeys = ['value1', 'value2'],
  colors = ['#0052cc', '#06b6d4', '#ff9500'],
}: AdvancedChartProps & { dataKeys?: string[] }) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-secondary-light mt-1">{description}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#1f2937' }}
            cursor={{ stroke: '#0052cc', strokeWidth: 2 }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
