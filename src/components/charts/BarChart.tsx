import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ChartRendererProps } from '../../types/index.ts'
import type { ProductRevenue } from '../../types/index.ts'

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e']

export function BarChart({ data, width, height, onItemClick }: ChartRendererProps) {
  const products = data as ProductRevenue[]
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const tooltipFontSize = Math.max(11, Math.round(width * 0.028))
  const margin = Math.round(width * 0.04)

  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsBarChart
        data={products}
        margin={{ top: 5, right: margin, bottom: 5, left: margin }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
        <XAxis
          dataKey="product"
          tick={{ fill: '#7090b0', fontSize }}
          axisLine={{ stroke: '#2a3550' }}
        />
        <YAxis
          tick={{ fill: '#7090b0', fontSize }}
          axisLine={{ stroke: '#2a3550' }}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            background: '#0d1520',
            border: '1px solid #2a3a50',
            borderRadius: '6px',
            color: '#c0d0e0',
            fontSize: `${tooltipFontSize}px`,
          }}
          formatter={(value, _name, props) => {
            const v = (value as number) ?? 0
            const p = (props as { payload: ProductRevenue }).payload
            return [`$${v.toLocaleString()} (${p.growth > 0 ? '+' : ''}${p.growth}%)`, 'Revenue']
          }}
        />
        <Bar
          dataKey="revenue"
          radius={[4, 4, 0, 0]}
          activeBar={false}
          onClick={onItemClick ? (_data, index, e) => { e.stopPropagation(); onItemClick(index, products[index].product) } : undefined}
        >
          {products.map((_, i) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
              cursor={onItemClick ? 'pointer' : undefined}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
