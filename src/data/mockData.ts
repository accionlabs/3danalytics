import type {
  PanelConfig,
  CausalLink,
  RevenueDataPoint,
  ChurnDataPoint,
  CohortRow,
  FunnelStage,
  KpiMetric,
  GeoRegion,
  ProductRevenue,
} from '../types/index.ts'

// ────────────────────────────────────────────────────────────
// Deterministic pseudo-random number generator (mulberry32)
// ────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function seededRange(seed: number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min)
}

// ────────────────────────────────────────────────────────────
// Base data generators (aggregate / summary level)
// ────────────────────────────────────────────────────────────

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const revenueData: RevenueDataPoint[] = months.map((month, i) => {
  const baseMrr = 120000 + i * 15000
  const mrr = Math.round(baseMrr + seededRange(i * 100, -5000, 8000))
  const newRevenue = Math.round(seededRange(i * 200, 8000, 25000))
  const churnedRevenue = Math.round(seededRange(i * 300, 3000, 12000))
  return { month, mrr, arr: mrr * 12, newRevenue, churnedRevenue }
})

export const churnData: ChurnDataPoint[] = months.map((month, i) => {
  const baseRate = 4.5 - i * 0.15
  const churnRate = Math.round((baseRate + seededRange(i * 400, -0.8, 0.8)) * 100) / 100
  const customers = Math.round(2800 + i * 180 + seededRange(i * 500, -50, 50))
  const churned = Math.round(customers * churnRate / 100)
  return { month, churnRate: Math.max(1.5, churnRate), customers, churned }
})

export const cohortData: CohortRow[] = [
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025',
].map((cohort, ci) => {
  const retention = [100]
  for (let m = 1; m <= 6; m++) {
    const prev = retention[m - 1]
    const drop = seededRange(ci * 1000 + m * 100, 5, 15)
    retention.push(Math.round(Math.max(20, prev - drop) * 10) / 10)
  }
  return { cohort, retention }
})

export const funnelData: FunnelStage[] = [
  { stage: 'Website Visitors', count: 52000, conversionRate: 100 },
  { stage: 'Sign-ups', count: 8200, conversionRate: 15.8 },
  { stage: 'Trial Started', count: 4100, conversionRate: 50.0 },
  { stage: 'Paid Conversion', count: 1230, conversionRate: 30.0 },
  { stage: 'Enterprise', count: 185, conversionRate: 15.0 },
]

export const kpiData: KpiMetric[] = [
  { label: 'Total Customers', value: 4850, unit: '', trend: 12.3, trendDirection: 'up' },
  { label: 'MRR', value: 285000, unit: '$', trend: 8.7, trendDirection: 'up' },
  { label: 'ARPU', value: 58.76, unit: '$', trend: -2.1, trendDirection: 'down' },
  { label: 'LTV', value: 2340, unit: '$', trend: 5.4, trendDirection: 'up' },
  { label: 'NPS', value: 72, unit: '', trend: 0, trendDirection: 'flat' },
]

export const geoData: GeoRegion[] = [
  { region: 'North America', revenue: 145000, customers: 2100 },
  { region: 'Europe', revenue: 82000, customers: 1350 },
  { region: 'Asia Pacific', revenue: 38000, customers: 820 },
  { region: 'Latin America', revenue: 12000, customers: 340 },
  { region: 'Middle East & Africa', revenue: 8000, customers: 240 },
]

export const productData: ProductRevenue[] = [
  { product: 'Starter', revenue: 42000, growth: 15.2 },
  { product: 'Professional', revenue: 98000, growth: 22.1 },
  { product: 'Enterprise', revenue: 125000, growth: 8.4 },
  { product: 'Add-ons', revenue: 20000, growth: 35.0 },
]

// ────────────────────────────────────────────────────────────
// Segment-specific data generators
// ────────────────────────────────────────────────────────────

function segmentRevenue(segmentLabel: string, seed: number): RevenueDataPoint[] {
  const scale = segmentLabel === 'Enterprise' ? 0.5 : segmentLabel === 'SMB' ? 0.3 : 0.2
  return months.map((month, i) => {
    const baseMrr = Math.round((120000 + i * 15000) * scale)
    const mrr = Math.round(baseMrr + seededRange(seed + i * 100, -3000, 5000) * scale)
    const newRevenue = Math.round(seededRange(seed + i * 200, 8000, 25000) * scale)
    const churnedRevenue = Math.round(seededRange(seed + i * 300, 3000, 12000) * scale)
    return { month, mrr, arr: mrr * 12, newRevenue, churnedRevenue }
  })
}

function segmentFunnel(segmentLabel: string): FunnelStage[] {
  const scale = segmentLabel === 'Enterprise' ? 0.15 : segmentLabel === 'SMB' ? 0.35 : 0.5
  return funnelData.map((s) => ({
    ...s,
    count: Math.round(s.count * scale),
  }))
}

function segmentKpi(segmentLabel: string, seed: number): KpiMetric[] {
  const scale = segmentLabel === 'Enterprise' ? 0.4 : segmentLabel === 'SMB' ? 0.35 : 0.25
  return kpiData.map((k, i) => ({
    ...k,
    value: Math.round(k.value * scale + seededRange(seed + i * 50, -100, 100)),
    trend: Math.round((k.trend + seededRange(seed + i * 70, -2, 2)) * 10) / 10,
  }))
}

function segmentChurn(segmentLabel: string, seed: number): ChurnDataPoint[] {
  const rateScale = segmentLabel === 'Enterprise' ? 0.7 : segmentLabel === 'SMB' ? 1.0 : 1.5
  const custScale = segmentLabel === 'Enterprise' ? 0.15 : segmentLabel === 'SMB' ? 0.35 : 0.5
  return months.map((month, i) => {
    const baseRate = (4.5 - i * 0.15) * rateScale
    const churnRate = Math.round((baseRate + seededRange(seed + i * 400, -0.8, 0.8)) * 100) / 100
    const customers = Math.round((2800 + i * 180) * custScale)
    const churned = Math.round(customers * churnRate / 100)
    return { month, churnRate: Math.max(1.0, churnRate), customers, churned }
  })
}

function segmentProduct(segmentLabel: string, seed: number): ProductRevenue[] {
  const scale = segmentLabel === 'Enterprise' ? 2.0 : segmentLabel === 'SMB' ? 1.0 : 0.5
  return productData.map((p, i) => ({
    ...p,
    revenue: Math.round(p.revenue * scale + seededRange(seed + i * 100, -5000, 5000)),
    growth: Math.round((p.growth + seededRange(seed + i * 200, -5, 5)) * 10) / 10,
  }))
}

// ────────────────────────────────────────────────────────────
// Z=3 deep-detail data generators
// ────────────────────────────────────────────────────────────

const leadSourceBase: ProductRevenue[] = [
  { product: 'Organic Search', revenue: 3200, growth: 18.5 },
  { product: 'Paid Ads', revenue: 2800, growth: 12.3 },
  { product: 'Referrals', revenue: 1400, growth: 25.0 },
  { product: 'Events', revenue: 800, growth: -5.2 },
]

function segmentLeadSource(segmentLabel: string, seed: number): ProductRevenue[] {
  const scale = segmentLabel === 'Enterprise' ? 1.0 : segmentLabel === 'SMB' ? 0.6 : 0.3
  return leadSourceBase.map((p, i) => ({
    ...p,
    revenue: Math.round(p.revenue * scale + seededRange(seed + i * 100, -200, 200)),
    growth: Math.round((p.growth + seededRange(seed + i * 200, -3, 3)) * 10) / 10,
  }))
}

const pipelineStageBase: FunnelStage[] = [
  { stage: 'Discovery', count: 450, conversionRate: 100 },
  { stage: 'Qualification', count: 320, conversionRate: 71.1 },
  { stage: 'Proposal', count: 180, conversionRate: 56.3 },
  { stage: 'Negotiation', count: 95, conversionRate: 52.8 },
  { stage: 'Closed Won', count: 42, conversionRate: 44.2 },
]

function segmentPipelineStage(segmentLabel: string, seed: number): FunnelStage[] {
  const scale = segmentLabel === 'Enterprise' ? 0.4 : segmentLabel === 'SMB' ? 0.7 : 1.0
  return pipelineStageBase.map((s, i) => {
    const count = Math.round(s.count * scale + seededRange(seed + i * 100, -20, 20))
    return { ...s, count }
  })
}

const accountRevenueBase: ProductRevenue[] = [
  { product: 'Acme Corp', revenue: 45000, growth: 8.2 },
  { product: 'GlobalTech', revenue: 38000, growth: 15.1 },
  { product: 'DataFlow Inc', revenue: 32000, growth: -3.4 },
  { product: 'CloudFirst', revenue: 28000, growth: 22.0 },
  { product: 'NetScale', revenue: 21000, growth: 5.7 },
]

function segmentAccountRevenue(segmentLabel: string, seed: number): ProductRevenue[] {
  const scale = segmentLabel === 'Enterprise' ? 1.0 : segmentLabel === 'SMB' ? 0.5 : 0.2
  return accountRevenueBase.map((p, i) => ({
    ...p,
    revenue: Math.round(p.revenue * scale + seededRange(seed + i * 100, -3000, 3000)),
    growth: Math.round((p.growth + seededRange(seed + i * 200, -4, 4)) * 10) / 10,
  }))
}

// ────────────────────────────────────────────────────────────
// Panel definitions organized by the Spatial Grammar
// ────────────────────────────────────────────────────────────

// Segments: Y=0 Startup, Y=1 SMB, Y=2 Enterprise
const segments = [
  { y: 0, label: 'Startup' },
  { y: 1, label: 'SMB' },
  { y: 2, label: 'Enterprise' },
]

// ── Z=0: Single root dashboard (the home view) ──
// Entry point for the entire spatial grammar. Drill down from here.
// Shows one summary KPI per pipeline stage — a true overview of all five.

const dashboardSummaryData: KpiMetric[] = [
  { label: 'Marketing Spend', value: 285000, unit: '$', trend: 15.2, trendDirection: 'up' },
  { label: 'Leads Generated', value: 8200, unit: '', trend: 12.8, trendDirection: 'up' },
  { label: 'Pipeline Value', value: 1450000, unit: '$', trend: 8.7, trendDirection: 'up' },
  { label: 'Closed Revenue', value: 620000, unit: '$', trend: 5.4, trendDirection: 'up' },
  { label: 'Retention Rate', value: 95.5, unit: '%', trend: -0.3, trendDirection: 'down' },
]

const dashboardPanel: PanelConfig = {
  id: 'dashboard',
  title: 'SaaS Dashboard',
  chartType: 'kpi',
  size: { width: 4, height: 2.5 },
  data: dashboardSummaryData,
  semantic: { processStep: 2, segment: null, detailLevel: 0 },
  processLabel: 'Overview',
}

// ── Z=1: Pipeline summary panels (5 panels along X-axis) ──
// Children of the dashboard. Each represents one stage of the pipeline.

const summaryPanels: PanelConfig[] = [
  {
    id: 'marketing',
    title: 'Marketing Spend',
    chartType: 'bar',
    size: { width: 3, height: 2 },
    data: productData,
    semantic: { processStep: 0, segment: null, detailLevel: 1 },
    parentId: 'dashboard',
    processLabel: 'Marketing',
  },
  {
    id: 'leads',
    title: 'Leads Generated',
    chartType: 'funnel',
    size: { width: 2.5, height: 2.5 },
    data: funnelData,
    semantic: { processStep: 1, segment: null, detailLevel: 1 },
    parentId: 'dashboard',
    processLabel: 'Leads',
  },
  {
    id: 'pipeline',
    title: 'Pipeline Value',
    chartType: 'revenue',
    size: { width: 3, height: 2 },
    data: revenueData,
    semantic: { processStep: 2, segment: null, detailLevel: 1 },
    parentId: 'dashboard',
    processLabel: 'Pipeline',
  },
  {
    id: 'revenue',
    title: 'Closed Revenue',
    chartType: 'kpi',
    size: { width: 3.5, height: 2 },
    data: kpiData,
    semantic: { processStep: 3, segment: null, detailLevel: 1 },
    parentId: 'dashboard',
    processLabel: 'Revenue',
  },
  {
    id: 'retention',
    title: 'Retention & Churn',
    chartType: 'churn',
    size: { width: 3, height: 2 },
    data: churnData,
    semantic: { processStep: 4, segment: null, detailLevel: 1 },
    parentId: 'dashboard',
    processLabel: 'Retention',
  },
]

// ── Z=2: Full segment × pipeline grid (5 steps × 3 segments = 15 panels) ──
// Drilling from any Z=1 panel reveals its 3 segment variants at Z=2.
// At Z=2, causal flow runs left-to-right within each segment row,
// and segments stack vertically for comparison.

const segmentPanels: PanelConfig[] = segments.flatMap(({ y, label }) => [
  {
    id: `marketing-${label.toLowerCase()}`,
    title: `${label} Marketing`,
    chartType: 'bar',
    size: { width: 3, height: 2 },
    data: segmentProduct(label, y * 10000 + 0),
    semantic: { processStep: 0, segment: y, detailLevel: 2 },
    parentId: 'marketing',
    segmentLabel: label,
    processLabel: 'Marketing',
  },
  {
    id: `leads-${label.toLowerCase()}`,
    title: `${label} Leads`,
    chartType: 'funnel',
    size: { width: 2.5, height: 2.5 },
    data: segmentFunnel(label),
    semantic: { processStep: 1, segment: y, detailLevel: 2 },
    parentId: 'leads',
    segmentLabel: label,
    processLabel: 'Leads',
  },
  {
    id: `pipeline-${label.toLowerCase()}`,
    title: `${label} Pipeline`,
    chartType: 'revenue',
    size: { width: 3, height: 2 },
    data: segmentRevenue(label, y * 10000 + 1),
    semantic: { processStep: 2, segment: y, detailLevel: 2 },
    parentId: 'pipeline',
    segmentLabel: label,
    processLabel: 'Pipeline',
  },
  {
    id: `revenue-${label.toLowerCase()}`,
    title: `${label} Revenue`,
    chartType: 'kpi',
    size: { width: 3.5, height: 2 },
    data: segmentKpi(label, y * 20000),
    semantic: { processStep: 3, segment: y, detailLevel: 2 },
    parentId: 'revenue',
    segmentLabel: label,
    processLabel: 'Revenue',
  },
  {
    id: `retention-${label.toLowerCase()}`,
    title: `${label} Retention`,
    chartType: 'churn',
    size: { width: 3, height: 2 },
    data: segmentChurn(label, y * 10000 + 4),
    semantic: { processStep: 4, segment: y, detailLevel: 2 },
    parentId: 'retention',
    segmentLabel: label,
    processLabel: 'Retention',
  },
])

// ── Z=3: Granular detail panels (deep drill-down from selected Z=2 panels) ──
// These demonstrate a fourth depth level for full 3-axis navigation.

const detailPanels: PanelConfig[] = [
  ...segments.map(({ y, label }) => ({
    id: `leads-${label.toLowerCase()}-source`,
    title: `${label} Leads by Source`,
    chartType: 'bar',
    size: { width: 3, height: 2 },
    data: segmentLeadSource(label, y * 30000),
    semantic: { processStep: 1, segment: y, detailLevel: 3 },
    parentId: `leads-${label.toLowerCase()}`,
    segmentLabel: label,
    processLabel: 'Leads',
  })),
  ...segments.map(({ y, label }) => ({
    id: `pipeline-${label.toLowerCase()}-stage`,
    title: `${label} Pipeline by Stage`,
    chartType: 'funnel',
    size: { width: 2.5, height: 2.5 },
    data: segmentPipelineStage(label, y * 40000),
    semantic: { processStep: 2, segment: y, detailLevel: 3 },
    parentId: `pipeline-${label.toLowerCase()}`,
    segmentLabel: label,
    processLabel: 'Pipeline',
  })),
  ...segments.map(({ y, label }) => ({
    id: `revenue-${label.toLowerCase()}-account`,
    title: `${label} Revenue by Account`,
    chartType: 'bar',
    size: { width: 3, height: 2 },
    data: segmentAccountRevenue(label, y * 50000),
    semantic: { processStep: 3, segment: y, detailLevel: 3 },
    parentId: `revenue-${label.toLowerCase()}`,
    segmentLabel: label,
    processLabel: 'Revenue',
  })),
]

// ── Assembled panel set ──

export const defaultPanels: PanelConfig[] = [
  dashboardPanel,     // 1 panel  (Z=0)
  ...summaryPanels,   // 5 panels (Z=1)
  ...segmentPanels,   // 15 panels (Z=2)
  ...detailPanels,    // 9 panels  (Z=3)
]                     // Total: 30 panels

// ────────────────────────────────────────────────────────────
// Causal Links
// ────────────────────────────────────────────────────────────

export const causalLinks: CausalLink[] = [
  // ── Z-axis hierarchy: Z=0 dashboard → Z=1 pipeline summary ──
  { from: 'dashboard', to: 'marketing', type: 'hierarchy' },
  { from: 'dashboard', to: 'leads', type: 'hierarchy' },
  { from: 'dashboard', to: 'pipeline', type: 'hierarchy' },
  { from: 'dashboard', to: 'revenue', type: 'hierarchy' },
  { from: 'dashboard', to: 'retention', type: 'hierarchy' },

  // ── X-axis causal flow at Z=1 (summary pipeline) ──
  { from: 'marketing', to: 'leads', type: 'causal' },
  { from: 'leads', to: 'pipeline', type: 'causal' },
  { from: 'pipeline', to: 'revenue', type: 'causal' },
  { from: 'revenue', to: 'retention', type: 'causal' },

  // ── X-axis causal flow at Z=2 (within each segment) ──
  ...segments.flatMap(({ label }) => {
    const seg = label.toLowerCase()
    return [
      { from: `marketing-${seg}`, to: `leads-${seg}`, type: 'causal' as const },
      { from: `leads-${seg}`, to: `pipeline-${seg}`, type: 'causal' as const },
      { from: `pipeline-${seg}`, to: `revenue-${seg}`, type: 'causal' as const },
      { from: `revenue-${seg}`, to: `retention-${seg}`, type: 'causal' as const },
    ]
  }),

  // ── Z-axis hierarchy: Z=1 summary → Z=2 segment breakdowns ──
  ...segments.flatMap(({ label }) => {
    const seg = label.toLowerCase()
    return [
      { from: 'marketing', to: `marketing-${seg}`, type: 'hierarchy' as const },
      { from: 'leads', to: `leads-${seg}`, type: 'hierarchy' as const },
      { from: 'pipeline', to: `pipeline-${seg}`, type: 'hierarchy' as const },
      { from: 'revenue', to: `revenue-${seg}`, type: 'hierarchy' as const },
      { from: 'retention', to: `retention-${seg}`, type: 'hierarchy' as const },
    ]
  }),

  // ── Z-axis hierarchy: Z=2 → Z=3 deep detail ──
  ...segments.map(({ label }) => ({
    from: `leads-${label.toLowerCase()}`,
    to: `leads-${label.toLowerCase()}-source`,
    type: 'hierarchy' as const,
  })),
  ...segments.map(({ label }) => ({
    from: `pipeline-${label.toLowerCase()}`,
    to: `pipeline-${label.toLowerCase()}-stage`,
    type: 'hierarchy' as const,
  })),
  ...segments.map(({ label }) => ({
    from: `revenue-${label.toLowerCase()}`,
    to: `revenue-${label.toLowerCase()}-account`,
    type: 'hierarchy' as const,
  })),

  // ── Y-axis segment links at Z=2 (vertical comparison at each pipeline step) ──
  ...(['marketing', 'leads', 'pipeline', 'revenue', 'retention'] as const).flatMap((step) => [
    { from: `${step}-startup`, to: `${step}-smb`, type: 'segment' as const },
    { from: `${step}-smb`, to: `${step}-enterprise`, type: 'segment' as const },
  ]),

  // ── Y-axis segment links at Z=3 ──
  { from: 'leads-startup-source', to: 'leads-smb-source', type: 'segment' },
  { from: 'leads-smb-source', to: 'leads-enterprise-source', type: 'segment' },
  { from: 'pipeline-startup-stage', to: 'pipeline-smb-stage', type: 'segment' },
  { from: 'pipeline-smb-stage', to: 'pipeline-enterprise-stage', type: 'segment' },
  { from: 'revenue-startup-account', to: 'revenue-smb-account', type: 'segment' },
  { from: 'revenue-smb-account', to: 'revenue-enterprise-account', type: 'segment' },
]
