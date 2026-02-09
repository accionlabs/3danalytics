import { describe, it, expect } from 'vitest'
import {
  revenueData,
  churnData,
  cohortData,
  funnelData,
  kpiData,
  geoData,
  productData,
  defaultPanels,
} from '../data/mockData.ts'

describe('mockData', () => {
  it('revenueData has 12 months with valid values', () => {
    expect(revenueData).toHaveLength(12)
    for (const d of revenueData) {
      expect(d.month).toBeTruthy()
      expect(d.mrr).toBeGreaterThan(0)
      expect(d.arr).toBe(d.mrr * 12)
      expect(d.newRevenue).toBeGreaterThan(0)
      expect(d.churnedRevenue).toBeGreaterThan(0)
    }
  })

  it('churnData has 12 months with valid rates', () => {
    expect(churnData).toHaveLength(12)
    for (const d of churnData) {
      expect(d.churnRate).toBeGreaterThan(0)
      expect(d.churnRate).toBeLessThan(20) // sanity check
      expect(d.customers).toBeGreaterThan(0)
    }
  })

  it('cohortData has correct structure', () => {
    expect(cohortData.length).toBeGreaterThan(0)
    for (const row of cohortData) {
      expect(row.cohort).toBeTruthy()
      expect(row.retention[0]).toBe(100) // first month is always 100%
      // Retention should be monotonically decreasing
      for (let i = 1; i < row.retention.length; i++) {
        expect(row.retention[i]).toBeLessThanOrEqual(row.retention[i - 1])
      }
    }
  })

  it('funnelData has descending counts', () => {
    expect(funnelData.length).toBeGreaterThan(0)
    for (let i = 1; i < funnelData.length; i++) {
      expect(funnelData[i].count).toBeLessThan(funnelData[i - 1].count)
    }
  })

  it('kpiData has valid metrics', () => {
    expect(kpiData.length).toBeGreaterThan(0)
    for (const kpi of kpiData) {
      expect(kpi.label).toBeTruthy()
      expect(['up', 'down', 'flat']).toContain(kpi.trendDirection)
    }
  })

  it('geoData has regions with revenue', () => {
    expect(geoData.length).toBeGreaterThan(0)
    for (const region of geoData) {
      expect(region.region).toBeTruthy()
      expect(region.revenue).toBeGreaterThan(0)
    }
  })

  it('productData has products with revenue', () => {
    expect(productData.length).toBeGreaterThan(0)
    for (const product of productData) {
      expect(product.product).toBeTruthy()
      expect(product.revenue).toBeGreaterThan(0)
    }
  })

  it('defaultPanels has 7 panels with unique ids', () => {
    expect(defaultPanels).toHaveLength(7)
    const ids = defaultPanels.map((p) => p.id)
    expect(new Set(ids).size).toBe(7)
    for (const panel of defaultPanels) {
      expect(panel.chartType).toBeTruthy()
      expect(panel.size.width).toBeGreaterThan(0)
      expect(panel.size.height).toBeGreaterThan(0)
    }
  })
})
