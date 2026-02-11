import type { ChartRendererProps } from '../../types/index.ts'
import type { FunnelStage } from '../../types/index.ts'

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

export function FunnelChart({ data, width, height, onItemClick }: ChartRendererProps) {
  const stages = data as FunnelStage[]
  const maxCount = stages[0]?.count ?? 1
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const labelHeight = fontSize + 4
  const barHeight = Math.max(12, Math.floor((height - stages.length * labelHeight) / stages.length) - 4)

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 0',
      }}
    >
      {stages.map((stage, i) => {
        const barWidth = Math.max(40, (stage.count / maxCount) * width)
        return (
          <div
            key={stage.stage}
            onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick(i, stage.stage) } : undefined}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {/* Label row: stage name left, count right */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  color: '#c0d0e0',
                  fontSize,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {stage.stage}
              </span>
              <span
                style={{
                  color: '#8090b0',
                  fontSize: fontSize - 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {stage.count.toLocaleString()} ({stage.conversionRate}%)
              </span>
            </div>
            {/* Bar */}
            <div
              style={{
                width: barWidth,
                height: barHeight,
                background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}88)`,
                borderRadius: '0 4px 4px 0',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
