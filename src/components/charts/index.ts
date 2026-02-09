import { registerChart } from '../../registry/chartRegistry.ts'
import { RevenueChart } from './RevenueChart.tsx'
import { ChurnChart } from './ChurnChart.tsx'
import { CohortChart } from './CohortChart.tsx'
import { FunnelChart } from './FunnelChart.tsx'
import { KpiCard } from './KpiCard.tsx'
import { GeoChart } from './GeoChart.tsx'
import { BarChart } from './BarChart.tsx'

registerChart('revenue', RevenueChart)
registerChart('churn', ChurnChart)
registerChart('cohort', CohortChart)
registerChart('funnel', FunnelChart)
registerChart('kpi', KpiCard)
registerChart('geo', GeoChart)
registerChart('bar', BarChart)
