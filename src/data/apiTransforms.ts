/**
 * Transforms raw API responses from the Semantic Chart Engine into the
 * PanelConfig and CausalLink shapes consumed by the 3D dashboard shell.
 */

import type { ApiChart, ApiChartSummary } from '../services/chartApi.ts'
import type { PanelConfig, CausalLink } from '../types/index.ts'

/** Convert a fully-loaded API chart to a PanelConfig. */
export function chartToPanel(chart: ApiChart): PanelConfig {
  return {
    id: chart.id,
    title: chart.title,
    chartType: chart.chartType,
    size: chart.size,
    data: chart.data,
    semantic: {
      processStep: chart.semantic.processStep,
      segment: chart.semantic.segment,         // null = cross-segment, matches SemanticAddress
      detailLevel: chart.semantic.detailLevel,
    },
    parentId: chart.parentId ?? undefined,
    segmentLabel: chart.segmentLabel ?? undefined,
    processLabel: chart.processLabel,
  }
}

/**
 * Derive CausalLinks from chart summaries.
 *
 * Three link types are reconstructed:
 *  - hierarchy  — parent → child (via parentId)
 *  - causal     — consecutive processStep at the same detailLevel & segment
 *  - segment    — same processStep & detailLevel, ordered by segment value
 */
export function buildCausalLinks(charts: ApiChartSummary[]): CausalLink[] {
  const links: CausalLink[] = []

  // 1. Hierarchy links: parent → child
  for (const chart of charts) {
    if (chart.parentId) {
      links.push({ from: chart.parentId, to: chart.id, type: 'hierarchy' })
    }
  }

  // 2. Causal links: sequential processSteps at the same detailLevel and segment
  // Group by detailLevel + segment key
  const byLevelAndSegment = new Map<string, ApiChartSummary[]>()
  for (const chart of charts) {
    const key = `${chart.semantic.detailLevel}:${chart.semantic.segment ?? 'null'}`
    const group = byLevelAndSegment.get(key) ?? []
    group.push(chart)
    byLevelAndSegment.set(key, group)
  }
  for (const group of byLevelAndSegment.values()) {
    const sorted = [...group].sort((a, b) => a.semantic.processStep - b.semantic.processStep)
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i]
      const next = sorted[i + 1]
      // Only link adjacent steps (no gaps)
      if (next.semantic.processStep === curr.semantic.processStep + 1) {
        links.push({ from: curr.id, to: next.id, type: 'causal' })
      }
    }
  }

  // 3. Segment links: same processStep & detailLevel, different segments, ordered by segment
  const byStepAndLevel = new Map<string, ApiChartSummary[]>()
  for (const chart of charts) {
    if (chart.semantic.segment === null || chart.semantic.segment === undefined) continue
    const key = `${chart.semantic.processStep}:${chart.semantic.detailLevel}`
    const group = byStepAndLevel.get(key) ?? []
    group.push(chart)
    byStepAndLevel.set(key, group)
  }
  for (const group of byStepAndLevel.values()) {
    const sorted = [...group].sort((a, b) => (a.semantic.segment ?? 0) - (b.semantic.segment ?? 0))
    for (let i = 0; i < sorted.length - 1; i++) {
      links.push({ from: sorted[i].id, to: sorted[i + 1].id, type: 'segment' })
    }
  }

  return links
}

/**
 * Fetch and transform all charts for a platform into PanelConfigs + CausalLinks.
 * Fetches summaries first (for link derivation), then all full charts in parallel.
 */
export async function loadDashboardFromApi(
  fetchAllChartSummaries: () => Promise<ApiChartSummary[]>,
  fetchChart: (id: string) => Promise<ApiChart>,
): Promise<{ panels: PanelConfig[]; causalLinks: CausalLink[] }> {
  const summaries = await fetchAllChartSummaries()
  const charts = await Promise.all(summaries.map((s) => fetchChart(s.id)))
  const panels = charts.map(chartToPanel)
  const causalLinks = buildCausalLinks(summaries)
  return { panels, causalLinks }
}
