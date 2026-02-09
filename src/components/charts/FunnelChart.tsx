import type { ChartRendererProps } from '../../types/index.ts'
import type { FunnelStage } from '../../types/index.ts'

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

export function FunnelChart({ data, width, height }: ChartRendererProps) {
  const stages = data as FunnelStage[]
  const maxCount = stages[0]?.count ?? 1
  const barHeight = Math.floor((height - 20) / stages.length) - 8
  const fontSize = Math.max(10, Math.round(width * 0.024))

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 6,
        padding: '4px 0',
      }}
    >
      {stages.map((stage, i) => {
        const barWidth = Math.max(60, (stage.count / maxCount) * (width - 20))
        return (
          <div key={stage.stage} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: barWidth,
                height: barHeight,
                background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}88)`,
                borderRadius: '0 6px 6px 0',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 12,
                transition: 'width 0.5s ease',
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontSize,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {stage.stage}
              </span>
            </div>
            <div
              style={{
                marginLeft: 10,
                color: '#8090b0',
                fontSize: fontSize - 1,
                whiteSpace: 'nowrap',
              }}
            >
              {stage.count.toLocaleString()} ({stage.conversionRate}%)
            </div>
          </div>
        )
      })}
    </div>
  )
}
