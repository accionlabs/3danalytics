import type {
  PanelConfig,
  RevenueDataPoint,
  ChurnDataPoint,
  CohortRow,
  FunnelStage,
  KpiMetric,
  GeoRegion,
  ProductRevenue,
} from '../types/index.ts'

// Deterministic pseudo-random number generator (mulberry32)
function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function seededRange(seed: number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min)
}

// ── Revenue Data ──
const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const revenueData: RevenueDataPoint[] = months.map((month, i) => {
  const baseMrr = 120000 + i * 15000
  const mrr = Math.round(baseMrr + seededRange(i * 100, -5000, 8000))
  const newRevenue = Math.round(seededRange(i * 200, 8000, 25000))
  const churnedRevenue = Math.round(seededRange(i * 300, 3000, 12000))
  return {
    month,
    mrr,
    arr: mrr * 12,
    newRevenue,
    churnedRevenue,
  }
})

// ── Churn Data ──
export const churnData: ChurnDataPoint[] = months.map((month, i) => {
  const baseRate = 4.5 - i * 0.15 // improving trend
  const churnRate = Math.round((baseRate + seededRange(i * 400, -0.8, 0.8)) * 100) / 100
  const customers = Math.round(2800 + i * 180 + seededRange(i * 500, -50, 50))
  const churned = Math.round(customers * churnRate / 100)
  return { month, churnRate: Math.max(1.5, churnRate), customers, churned }
})

// ── Cohort Retention ──
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

// ── Funnel Data ──
export const funnelData: FunnelStage[] = [
  { stage: 'Website Visitors', count: 52000, conversionRate: 100 },
  { stage: 'Sign-ups', count: 8200, conversionRate: 15.8 },
  { stage: 'Trial Started', count: 4100, conversionRate: 50.0 },
  { stage: 'Paid Conversion', count: 1230, conversionRate: 30.0 },
  { stage: 'Enterprise', count: 185, conversionRate: 15.0 },
]

// ── KPI Metrics ──
export const kpiData: KpiMetric[] = [
  { label: 'Total Customers', value: 4850, unit: '', trend: 12.3, trendDirection: 'up' },
  { label: 'MRR', value: 285000, unit: '$', trend: 8.7, trendDirection: 'up' },
  { label: 'ARPU', value: 58.76, unit: '$', trend: -2.1, trendDirection: 'down' },
  { label: 'LTV', value: 2340, unit: '$', trend: 5.4, trendDirection: 'up' },
  { label: 'NPS', value: 72, unit: '', trend: 0, trendDirection: 'flat' },
]

// ── Geo Data ──
export const geoData: GeoRegion[] = [
  { region: 'North America', revenue: 145000, customers: 2100 },
  { region: 'Europe', revenue: 82000, customers: 1350 },
  { region: 'Asia Pacific', revenue: 38000, customers: 820 },
  { region: 'Latin America', revenue: 12000, customers: 340 },
  { region: 'Middle East & Africa', revenue: 8000, customers: 240 },
]

// ── Product Revenue ──
export const productData: ProductRevenue[] = [
  { product: 'Starter', revenue: 42000, growth: 15.2 },
  { product: 'Professional', revenue: 98000, growth: 22.1 },
  { product: 'Enterprise', revenue: 125000, growth: 8.4 },
  { product: 'Add-ons', revenue: 20000, growth: 35.0 },
]

// ── Panel Configurations (assembled for the dashboard) ──

export const defaultPanels: PanelConfig[] = [
  {
    id: 'revenue',
    title: 'Revenue Overview',
    chartType: 'revenue',
    size: { width: 3, height: 2 },
    data: revenueData,
  },
  {
    id: 'churn',
    title: 'Churn Rate',
    chartType: 'churn',
    size: { width: 3, height: 2 },
    data: churnData,
  },
  {
    id: 'cohort',
    title: 'Cohort Retention',
    chartType: 'cohort',
    size: { width: 3, height: 2 },
    data: cohortData,
  },
  {
    id: 'funnel',
    title: 'Acquisition Funnel',
    chartType: 'funnel',
    size: { width: 2.5, height: 2.5 },
    data: funnelData,
  },
  {
    id: 'kpi',
    title: 'Key Metrics',
    chartType: 'kpi',
    size: { width: 3.5, height: 2 },
    data: kpiData,
  },
  {
    id: 'geo',
    title: 'Revenue by Region',
    chartType: 'geo',
    size: { width: 3, height: 2 },
    data: geoData,
  },
  {
    id: 'product',
    title: 'Revenue by Product',
    chartType: 'bar',
    size: { width: 3, height: 2 },
    data: productData,
  },
]
