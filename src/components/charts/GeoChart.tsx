import type { ChartRendererProps } from '../../types/index.ts'
import type { GeoRegion } from '../../types/index.ts'

const REGION_COLORS: Record<string, string> = {
  'North America': '#3b82f6',
  'Europe': '#6366f1',
  'Asia Pacific': '#8b5cf6',
  'Latin America': '#10b981',
  'Middle East & Africa': '#f59e0b',
}

export function GeoChart({ data, width, height }: ChartRendererProps) {
  const regions = data as GeoRegion[]
  const maxRevenue = Math.max(...regions.map((r) => r.revenue))
  const labelWidth = Math.round(width * 0.3)
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const barHeight = Math.min(32, Math.floor((height - 20) / regions.length) - 8)

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {regions.map((region) => {
          const barWidth = Math.max(
            40,
            (region.revenue / maxRevenue) * (width - labelWidth - 20),
          )
          const color = REGION_COLORS[region.region] ?? '#6b7280'

          return (
            <div
              key={region.region}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div
                style={{
                  width: labelWidth,
                  textAlign: 'right',
                  color: '#8090b0',
                  fontSize,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {region.region}
              </div>
              <div
                style={{
                  width: barWidth,
                  height: barHeight,
                  background: `linear-gradient(90deg, ${color}, ${color}66)`,
                  borderRadius: '0 6px 6px 0',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                }}
              >
                <span style={{ color: '#fff', fontSize, fontWeight: 600 }}>
                  ${(region.revenue / 1000).toFixed(0)}k
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
