import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { ChartRendererProps } from '../../types/index.ts'
import type { ChurnDataPoint } from '../../types/index.ts'

export function ChurnChart({ data, width, height }: ChartRendererProps) {
  const chartData = data as ChurnDataPoint[]
  const avgChurn =
    chartData.reduce((sum, d) => sum + d.churnRate, 0) / chartData.length
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const tooltipFontSize = Math.max(11, Math.round(width * 0.028))
  const margin = Math.round(width * 0.04)

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: margin, bottom: 5, left: margin }}>
        <defs>
          <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#7090b0', fontSize }}
          axisLine={{ stroke: '#2a3550' }}
        />
        <YAxis
          tick={{ fill: '#7090b0', fontSize }}
          axisLine={{ stroke: '#2a3550' }}
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: '#0d1520',
            border: '1px solid #2a3a50',
            borderRadius: '6px',
            color: '#c0d0e0',
            fontSize: `${tooltipFontSize}px`,
          }}
          formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Churn Rate']}
        />
        <ReferenceLine
          y={avgChurn}
          stroke="#f59e0b"
          strokeDasharray="5 5"
          label={{ value: 'Avg', fill: '#f59e0b', fontSize, position: 'right' }}
        />
        <Area
          type="monotone"
          dataKey="churnRate"
          stroke="#f43f5e"
          strokeWidth={2}
          fill="url(#churnGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
