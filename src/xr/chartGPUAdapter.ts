/**
 * Converts arbitrary panel data into ChartGPU series configurations.
 *
 * All builder functions use runtime data introspection — they inspect the
 * actual keys/values in the data array rather than casting to any specific
 * domain type. This makes every chart component reusable with any data shape
 * coming from the API.
 *
 * Chart visual style ↔ series type mapping:
 *   buildGenericBarOptions   → bar  series  (first numeric field → y)
 *   buildGenericLineOptions  → line series  (every numeric field → own series)
 *   buildGenericAreaOptions  → area series  (first numeric field → y)
 *
 * panelToChartGPUOptions dispatches by chartType (visual intent), not data shape:
 *   revenue  → multi-line
 *   churn    → area
 *   bar, funnel, geo → bar
 */
import type { ChartGPUOptions, BarSeriesConfig, LineSeriesConfig, AreaSeriesConfig } from 'chartgpu'
import type { PanelConfig } from '../types/index.ts'

export const WEBGPU_AVAILABLE = typeof navigator !== 'undefined' && 'gpu' in navigator

export const BRAND_PALETTE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4']

export const DARK_THEME_OVERRIDES: ChartGPUOptions['theme'] = {
  backgroundColor: '#080c1c',
  textColor: '#7090b0',
  axisLineColor: '#2a3550',
  axisTickColor: '#3a4560',
  gridLineColor: '#1a2540',
  colorPalette: BRAND_PALETTE,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
}

// ─── Data introspection helpers ───────────────────────────────────────────────

type DataRecord = Record<string, unknown>

/** Coerce arbitrary API response to an array of plain objects. */
function toRecords(data: unknown): DataRecord[] {
  if (!Array.isArray(data)) return []
  return data.filter((item) => item !== null && typeof item === 'object') as DataRecord[]
}

/** Return all keys whose first-row value is a finite number. */
function numericKeys(record: DataRecord): string[] {
  return Object.keys(record).filter((k) => typeof record[k] === 'number' && isFinite(record[k] as number))
}

/** Extract [index, value] tuples for a given field key. */
function extractXY(records: DataRecord[], key: string): readonly [number, number][] {
  return records.map((d, i) => [i, Number(d[key] ?? 0)] as const)
}

// ─── Generic builder functions ────────────────────────────────────────────────

/**
 * Bar chart: uses the **first** numeric field in the data as bar height.
 * Works for any data array that has at least one number-valued key.
 */
export function buildGenericBarOptions(data: unknown): ChartGPUOptions {
  const records = toRecords(data)
  const keys = records.length > 0 ? numericKeys(records[0]) : []
  const valueKey = keys[0] ?? 'value'

  const series: BarSeriesConfig = {
    type: 'bar',
    name: valueKey,
    data: extractXY(records, valueKey),
    barWidth: '70%',
  }
  return {
    theme: DARK_THEME_OVERRIDES,
    palette: BRAND_PALETTE,
    series: [series],
    xAxis: { type: 'value', min: -0.5, max: Math.max(records.length - 0.5, 0.5) },
  }
}

/**
 * Multi-line chart: creates one line series **per numeric field** found in
 * the first row. Ideal for time-series data with several metrics per point.
 */
export function buildGenericLineOptions(data: unknown): ChartGPUOptions {
  const records = toRecords(data)
  const keys = records.length > 0 ? numericKeys(records[0]) : []

  const series: LineSeriesConfig[] = keys.map((key, idx) => ({
    type: 'line',
    name: key,
    color: BRAND_PALETTE[idx % BRAND_PALETTE.length],
    data: extractXY(records, key),
  }))

  return {
    theme: DARK_THEME_OVERRIDES,
    series,
    legend: { show: true, position: 'top' },
  }
}

/**
 * Area chart: uses the **first** numeric field as the filled area.
 * Best for single-metric trend data (e.g. churn rate, NPS score).
 */
export function buildGenericAreaOptions(data: unknown): ChartGPUOptions {
  const records = toRecords(data)
  const keys = records.length > 0 ? numericKeys(records[0]) : []
  const valueKey = keys[0] ?? 'value'

  const series: AreaSeriesConfig = {
    type: 'area',
    name: valueKey,
    color: '#f43f5e',
    data: extractXY(records, valueKey),
    areaStyle: { opacity: 0.35 },
  }
  return { theme: DARK_THEME_OVERRIDES, series: [series] }
}

// ─── Panel dispatcher ─────────────────────────────────────────────────────────

/**
 * Maps a panel's **visual intent** (chartType) to the appropriate generic
 * builder.  Returns null for chart types handled by Canvas2D (kpi, cohort,
 * funnel) or that have no chart equivalent (embed).
 */
export function panelToChartGPUOptions(panel: PanelConfig): ChartGPUOptions {
  switch (panel.chartType) {
    case 'revenue':
      return buildGenericLineOptions(panel.data)

    case 'churn':
      return buildGenericAreaOptions(panel.data)

    case 'bar':
    case 'geo':
      return buildGenericBarOptions(panel.data)

    default: {
      // Unknown chart type from API — auto-detect the best visual:
      // multiple numeric fields → multi-line (shows all metrics)
      // single numeric field   → bar (cleaner than a single line)
      const records = toRecords(panel.data)
      const keys = records.length > 0 ? numericKeys(records[0]) : []
      return keys.length > 1
        ? buildGenericLineOptions(panel.data)
        : buildGenericBarOptions(panel.data)
    }
  }
}
