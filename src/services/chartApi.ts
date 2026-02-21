/**
 * Typed API client for the Semantic Chart Engine.
 * Targets the 3DAnalytics adapter at /api/platforms/3danalytics/...
 */

const BASE_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    ?.VITE_API_URL ?? 'http://192.168.0.202:3000';
const DEFAULT_PLATFORM = '3danalytics';

// ── API response types (mirror the OpenAPI schema) ──────────────────────────

export type ApiChartType =
  | 'kpi'
  | 'bar'
  | 'funnel'
  | 'revenue'
  | 'churn'
  | 'stackedBar';
export type ApiTrendDirection = 'up' | 'down' | 'flat';

export interface ApiChartSize {
  width: number;
  height: number;
}

export interface ApiSemanticMeta {
  processStep: number;
  segment: number | null; // null = cross-segment overview
  detailLevel: number;
}

export interface ApiChartSummary {
  id: string;
  title: string;
  chartType: ApiChartType;
  size: ApiChartSize;
  semantic: ApiSemanticMeta;
  processLabel: string;
  parentId?: string | null;
  segmentLabel?: string | null;
}

// Data item shapes — one per chartType
export interface ApiKpiDataItem {
  label: string;
  value: number;
  unit: string;
  trend: number;
  trendDirection: ApiTrendDirection;
}

export interface ApiBarDataItem {
  product: string;
  revenue: number;
  growth: number;
}

export interface ApiFunnelDataItem {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface ApiRevenueDataItem {
  month: string;
  mrr: number;
  arr: number;
  newRevenue: number;
  churnedRevenue: number;
}

export interface ApiChurnDataItem {
  month: string;
  churnRate: number;
  customers: number;
  churned: number;
}

export type ApiChartDataItem =
  | ApiKpiDataItem
  | ApiBarDataItem
  | ApiFunnelDataItem
  | ApiRevenueDataItem
  | ApiChurnDataItem;

export interface ApiChart extends ApiChartSummary {
  data: ApiChartDataItem[];
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? `API error ${response.status}: ${response.statusText}`,
    );
  }
  const json = (await response.json()) as { data: T };
  return json.data;
}

/** Fetch lightweight chart summaries (no data payload). */
export async function fetchAllChartSummaries(
  platformId: string = DEFAULT_PLATFORM,
): Promise<ApiChartSummary[]> {
  return apiFetch<ApiChartSummary[]>(`/api/platforms/${platformId}/charts`);
}

/** Fetch a single chart with its full data payload. */
export async function fetchChart(
  chartId: string,
  platformId: string = DEFAULT_PLATFORM,
): Promise<ApiChart> {
  return apiFetch<ApiChart>(`/api/platforms/${platformId}/charts/${chartId}`);
}

/** Fetch direct children of a chart with full data payloads. */
export async function fetchChartChildren(
  chartId: string,
  platformId: string = DEFAULT_PLATFORM,
): Promise<ApiChart[]> {
  return apiFetch<ApiChart[]>(
    `/api/platforms/${platformId}/charts/${chartId}/children`,
  );
}

// ── Voice Intent Classification API ──────────────────────────────────────────

export interface IntentClassificationRequest {
  /** User query from speech recognition */
  query: string;
}

export interface IntentClassificationResponse {
  /** Intent type: 'navigation' or 'visualization' */
  intent: 'navigation' | 'visualization';
  /** Confidence score (0-1) */
  confidence: number;
  /** Explanation of why this intent was classified */
  reasoning?: string;
}

/**
 * Classify user intent from voice transcript.
 * Determines whether user wants to navigate or create a visualization.
 */
export async function classifyIntent(
  request: IntentClassificationRequest,
  platformId: string = DEFAULT_PLATFORM,
): Promise<IntentClassificationResponse> {
  const response = await fetch(
    `${BASE_URL}/api/platforms/${platformId}/classify-intent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? `Intent classification failed: ${response.status}`,
    );
  }

  const json = (await response.json()) as {
    data: IntentClassificationResponse;
  };
  return json.data;
}

// ── Voice Navigation API ─────────────────────────────────────────────────────

export interface VoiceNavigationRequest {
  /** Transcript from speech recognition */
  query: string;
  /** List of currently visible panel IDs and titles */
  availablePanels: Array<{ id: string; title: string }>;
}

export interface VoiceNavigationResponse {
  /** Panel ID to navigate to */
  panelId: string;
  /** Optional confidence score (0-1) */
  confidence?: number;
  /** Optional explanation of why this panel was selected */
  reason?: string;
}

/**
 * Send voice transcript to API to determine which panel to navigate to.
 * API receives the query + list of available panels and returns the best match.
 */
export async function navigateByVoice(
  request: VoiceNavigationRequest,
  platformId: string = DEFAULT_PLATFORM,
): Promise<VoiceNavigationResponse> {
  const response = await fetch(
    `${BASE_URL}/api/platforms/${platformId}/navigate-by-voice`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? `Voice navigation failed: ${response.status}`,
    );
  }

  const json = (await response.json()) as { data: VoiceNavigationResponse };
  return json.data;
}

// ── Voice Visualization Generation API ──────────────────────────────────────

export interface VisualizationRequest {
  /** User query describing desired visualization */
  query: string;
}

export interface VisualizationResponse {
  /** User's original query */
  query: string;
  /** AI reasoning about how to visualize the query */
  reasoning: string;
  /** Narrative explanation of the generated visualizations */
  narrative: string;
  /** Generated chart configurations */
  data: ApiChart[];
  /** Key insights derived from the data */
  keyInsights: string[];
  /** Generation metadata */
  meta: {
    total: number;
    successful: number;
    failed: number;
    visualizationsGenerated: number;
  };
}

/**
 * Generate visualizations from natural language query.
 * AI interprets the query and returns chart configurations with data.
 */
export async function generateVisualization(
  request: VisualizationRequest,
  platformId: string = DEFAULT_PLATFORM,
): Promise<VisualizationResponse> {
  const response = await fetch(
    `${BASE_URL}/api/platforms/${platformId}/userquery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? `Visualization generation failed: ${response.status}`,
    );
  }

  const json = (await response.json()) as { data: VisualizationResponse };
  return json.data;
}
