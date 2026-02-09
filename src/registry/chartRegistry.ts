import type { ChartRenderer } from '../types/index.ts'

const chartRegistry = new Map<string, ChartRenderer>()

export function registerChart(type: string, renderer: ChartRenderer) {
  chartRegistry.set(type, renderer)
}

export function getChartRenderer(type: string): ChartRenderer | undefined {
  return chartRegistry.get(type)
}
