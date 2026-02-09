import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ChartRendererProps } from '../../types/index.ts'
import type { RevenueDataPoint } from '../../types/index.ts'

export function RevenueChart({ data, width, height }: ChartRendererProps) {
  const chartData = data as RevenueDataPoint[]
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const tooltipFontSize = Math.max(11, Math.round(width * 0.028))
  const margin = Math.round(width * 0.04)

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: margin, bottom: 5, left: margin }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#7090b0', fontSize }}
          axisLine={{ stroke: '#2a3550' }}
        />
        <YAxis
          tick={{ fill: '#7090b0', fontSize }}
          axisLine={{ stroke: '#2a3550' }}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: '#0d1520',
            border: '1px solid #2a3a50',
            borderRadius: '6px',
            color: '#c0d0e0',
            fontSize: `${tooltipFontSize}px`,
          }}
          formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: `${fontSize}px`, color: '#8090a0' }} />
        <Line
          type="monotone"
          dataKey="mrr"
          name="MRR"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="newRevenue"
          name="New Revenue"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="churnedRevenue"
          name="Churned"
          stroke="#f43f5e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
