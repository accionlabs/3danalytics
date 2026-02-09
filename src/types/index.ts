// ── Reusable shell types (domain-agnostic) ──

/** Panel definition — chartType is string, not a union.
 *  The shell doesn't know what chart types exist. */
export interface PanelConfig {
  id: string
  title: string
  chartType: string
  size: { width: number; height: number }
  data: unknown
  drillDown?: PanelConfig[]
}

/** Chart renderer contract — any chart component must satisfy this */
export interface ChartRendererProps {
  data: unknown
  width: number
  height: number
}
export type ChartRenderer = React.ComponentType<ChartRendererProps>

/** 3D position for a panel */
export interface PanelPosition {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}

/** Layout types */
export type LayoutType = 'arc' | 'grid' | 'room'

export interface LayoutConfig {
  type: LayoutType
  radius?: number
  columns?: number
  roomWidth?: number
  roomDepth?: number
}

/** Camera target */
export interface CameraTarget {
  position: [number, number, number]
  lookAt: [number, number, number]
  fov?: number
}

/** Dashboard state (Zustand) */
export interface DashboardState {
  panels: PanelConfig[]
  layout: LayoutType
  focusedPanelId: string | null
  drillDownStack: string[]
  cameraTarget: CameraTarget
  isTransitioning: boolean
  isDragging: boolean
  // Actions
  setPanels: (panels: PanelConfig[]) => void
  setLayout: (layout: LayoutType) => void
  focusPanel: (id: string) => void
  unfocus: () => void
  drillDown: (panelId: string) => void
  drillUp: () => void
  setTransitioning: (isTransitioning: boolean) => void
  setDragging: (isDragging: boolean) => void
}

// ── SaaS content pack types (domain-specific) ──

export interface RevenueDataPoint {
  month: string
  mrr: number
  arr: number
  newRevenue: number
  churnedRevenue: number
}

export interface ChurnDataPoint {
  month: string
  churnRate: number
  customers: number
  churned: number
}

export interface CohortRow {
  cohort: string
  retention: number[]
}

export interface FunnelStage {
  stage: string
  count: number
  conversionRate: number
}

export interface KpiMetric {
  label: string
  value: number
  unit: string
  trend: number
  trendDirection: 'up' | 'down' | 'flat'
}

export interface GeoRegion {
  region: string
  revenue: number
  customers: number
}

export interface ProductRevenue {
  product: string
  revenue: number
  growth: number
}
