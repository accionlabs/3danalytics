// ── Reusable shell types (domain-agnostic) ──

/** Semantic address in the 3D grammar space */
export interface SemanticAddress {
  processStep: number        // X-axis (0 = leftmost in pipeline)
  segment: number | null     // Y-axis (null = aggregated across segments)
  detailLevel: number        // Z-axis (0 = summary, 1+ = granular)
}

/** Causal/structural link between panels */
export interface CausalLink {
  from: string               // panel id
  to: string                 // panel id
  type: 'causal' | 'segment' | 'hierarchy'
}

/** Panel definition — chartType is string, not a union.
 *  The shell doesn't know what chart types exist. */
export interface PanelConfig {
  id: string
  title: string
  chartType: string
  size: { width: number; height: number }
  data: unknown
  semantic: SemanticAddress   // REQUIRED — every panel has a grammar address
  parentId?: string           // Z-axis parent panel
  segmentLabel?: string       // "Enterprise", "SMB", "Startup"
  processLabel?: string       // "Marketing", "Leads", "Pipeline"
}

/** Chart renderer contract — any chart component must satisfy this */
export interface ChartRendererProps {
  data: unknown
  width: number
  height: number
  onItemClick?: (index: number) => void
}
export type ChartRenderer = React.ComponentType<ChartRendererProps>

/** 3D position for a panel */
export interface PanelPosition {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}

/** Camera target */
export interface CameraTarget {
  position: [number, number, number]
  lookAt: [number, number, number]
  fov?: number
}

/** Navigation step for axis-aware history */
export interface NavigationStep {
  panelId: string
  axis: 'x' | 'y' | 'z' | 'home'
  label: string
  cameraTarget: CameraTarget
}

/** Navigation history with back/forward support */
export interface NavigationHistory {
  steps: NavigationStep[]
  currentIndex: number
}

/** Dashboard state (Zustand) */
export interface DashboardState {
  panels: PanelConfig[]
  focusedPanelId: string | null
  navigation: NavigationHistory
  visiblePanelIds: string[]
  cameraTarget: CameraTarget
  isTransitioning: boolean
  isDragging: boolean
  // Actions
  setPanels: (panels: PanelConfig[]) => void
  focusPanel: (id: string) => void
  unfocus: () => void
  navigateTo: (panelId: string, axis: 'x' | 'y' | 'z') => void
  navigateBack: () => void
  navigateForward: () => void
  navigateHome: () => void
  navigateToStep: (index: number) => void
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
