/**
 * Typed API client for the Semantic Chart Engine.
 * Targets the 3DAnalytics adapter at /api/platforms/3danalytics/...
 */

const BASE_URL = (import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_API_URL ?? 'http://localhost:3000'
const DEFAULT_PLATFORM = '3danalytics'

// ── API response types (mirror the OpenAPI schema) ──────────────────────────

export type ApiChartType = 'kpi' | 'bar' | 'funnel' | 'revenue' | 'churn'
export type ApiTrendDirection = 'up' | 'down' | 'flat'

export interface ApiChartSize {
  width: number
  height: number
}

export interface ApiSemanticMeta {
  processStep: number
  segment: number | null   // null = cross-segment overview
  detailLevel: number
}

export interface ApiChartSummary {
  id: string
  title: string
  chartType: ApiChartType
  size: ApiChartSize
  semantic: ApiSemanticMeta
  processLabel: string
  parentId?: string | null
  segmentLabel?: string | null
}

// Data item shapes — one per chartType
export interface ApiKpiDataItem {
  label: string
  value: number
  unit: string
  trend: number
  trendDirection: ApiTrendDirection
}

export interface ApiBarDataItem {
  product: string
  revenue: number
  growth: number
}

export interface ApiFunnelDataItem {
  stage: string
  count: number
  conversionRate: number
}

export interface ApiRevenueDataItem {
  month: string
  mrr: number
  arr: number
  newRevenue: number
  churnedRevenue: number
}

export interface ApiChurnDataItem {
  month: string
  churnRate: number
  customers: number
  churned: number
}

export type ApiChartDataItem =
  | ApiKpiDataItem
  | ApiBarDataItem
  | ApiFunnelDataItem
  | ApiRevenueDataItem
  | ApiChurnDataItem

export interface ApiChart extends ApiChartSummary {
  data: ApiChartDataItem[]
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `API error ${response.status}: ${response.statusText}`)
  }
  const json = await response.json() as { data: T }
  return json.data
}

/** Fetch lightweight chart summaries (no data payload). */
export async function fetchAllChartSummaries(
  platformId: string = DEFAULT_PLATFORM,
): Promise<ApiChartSummary[]> {
  return apiFetch<ApiChartSummary[]>(`/api/platforms/${platformId}/charts`)
}

/** Fetch a single chart with its full data payload. */
export async function fetchChart(
  chartId: string,
  platformId: string = DEFAULT_PLATFORM,
): Promise<ApiChart> {
  return apiFetch<ApiChart>(`/api/platforms/${platformId}/charts/${chartId}`)
}

/** Fetch direct children of a chart with full data payloads. */
export async function fetchChartChildren(
  chartId: string,
  platformId: string = DEFAULT_PLATFORM,
): Promise<ApiChart[]> {
  return apiFetch<ApiChart[]>(`/api/platforms/${platformId}/charts/${chartId}/children`)
}
