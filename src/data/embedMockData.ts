import type { PanelConfig, EmbedConfig, KpiMetric, ProductRevenue, FunnelStage } from '../types/index.ts'
import { defaultPanels, causalLinks } from './mockData.ts'

const REPORTS_PROD = 'https://accionlabs.github.io/3danalytics-reports/#/panel'
const REPORTS_LOCAL = 'http://localhost:5174/3danalytics-reports/#/panel'

const isDev = import.meta.env.DEV
const REPORTS_BASE = isDev ? REPORTS_LOCAL : REPORTS_PROD

// Build childMap: parentId → sorted child IDs (same logic as DashboardScene)
const childMap = new Map<string, string[]>()
for (const p of defaultPanels) {
  if (!p.parentId) continue
  const siblings = childMap.get(p.parentId) ?? []
  siblings.push(p.id)
  childMap.set(p.parentId, siblings)
}
for (const [parentId, children] of childMap) {
  const parent = defaultPanels.find((p) => p.id === parentId)
  children.sort((a, b) => {
    const pa = defaultPanels.find((p) => p.id === a)!
    const pb = defaultPanels.find((p) => p.id === b)!
    if (parent?.semantic.detailLevel === 0) return pa.semantic.processStep - pb.semantic.processStep
    return (pa.semantic.segment ?? 0) - (pb.semantic.segment ?? 0)
  })
}

/** Extract category labels from panel data based on chart type */
function extractLabels(panel: PanelConfig): string[] {
  switch (panel.chartType) {
    case 'kpi':
      return (panel.data as KpiMetric[]).map((m) => m.label)
    case 'bar':
      return (panel.data as ProductRevenue[]).map((p) => p.product)
    case 'funnel':
      return (panel.data as FunnelStage[]).map((s) => s.stage)
    default:
      return []
  }
}

/** Build drillMap for a panel: label → child panel ID */
function buildDrillMap(panel: PanelConfig): Record<string, string> | undefined {
  const children = childMap.get(panel.id)
  if (!children?.length) return undefined

  const labels = extractLabels(panel)
  if (!labels.length) return undefined

  const map: Record<string, string> = {}
  labels.forEach((label, i) => {
    if (i < children.length) {
      map[label] = children[i]
    }
  })
  return Object.keys(map).length > 0 ? map : undefined
}

/** All 30 panels remapped to chartType: 'embed' with iframe URLs pointing to the reports repo */
export const embedPanels: PanelConfig[] = defaultPanels.map((p) => {
  const drillMap = buildDrillMap(p)
  return {
    ...p,
    chartType: 'embed',
    data: {
      url: `${REPORTS_BASE}/${p.id}`,
      provider: 'custom',
      ...(drillMap ? { drillMap } : {}),
    } satisfies EmbedConfig,
  }
})

/** Re-export causal links unchanged */
export { causalLinks }
