import { useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import { buildGenericLineOptions, WEBGPU_AVAILABLE } from '../../xr/chartGPUAdapter.ts'
import { useChartGPU } from './useChartGPU.ts'
import { ChartLoader } from './ChartLoader.tsx'

export function RevenueChart({ data, width, height }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const options = useMemo(() => buildGenericLineOptions(data), [data])
  const { loading } = useChartGPU(containerRef, options, width, height)

  if (!WEBGPU_AVAILABLE) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#607090',
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        WebGPU not supported in this browser
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={containerRef} style={{ width, height, opacity: loading ? 0 : 1 }} />
      {loading && <ChartLoader width={width} height={height} />}
    </div>
  )
}
