/**
 * Shared React hook for mounting a ChartGPU instance inside a DOM container.
 *
 * Handles:
 *  - Async chart creation (returns a Promise)
 *  - React StrictMode double-invoke / cleanup race
 *  - Resize when width/height props change
 *  - Disposal on unmount
 *
 * Usage:
 *   const containerRef = useRef<HTMLDivElement>(null)
 *   useChartGPU(containerRef, options, width, height)
 *   return <div ref={containerRef} style={{ width, height }} />
 */
import { useEffect, useRef, useState } from 'react'
import { ChartGPU } from 'chartgpu'
import type { ChartGPUInstance, ChartGPUOptions } from 'chartgpu'

export function useChartGPU(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: ChartGPUOptions,
  width: number,
  height: number,
): { loading: boolean } {
  const instanceRef = useRef<ChartGPUInstance | null>(null)
  const [loading, setLoading] = useState(true)

  // Create / recreate chart when options reference changes.
  // Callers must stabilise options with useMemo to avoid unnecessary remounts.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setLoading(true)

    ChartGPU.create(container, options).then((chart) => {
      if (cancelled) {
        chart.dispose()
        return
      }
      instanceRef.current = chart
      // Force ChartGPU to measure the container immediately.
      // Without this, its internal ResizeObserver fires one tick later and the
      // canvas renders at the wrong (initial) size before correcting itself.
      chart.resize()
      setLoading(false)
    }).catch((err) => {
      console.error('[useChartGPU] create failed:', err)
      setLoading(false)
    })

    return () => {
      cancelled = true
      instanceRef.current?.dispose()
      instanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  // Notify ChartGPU when the container dimensions change
  useEffect(() => {
    instanceRef.current?.resize()
  }, [width, height])

  return { loading }
}
