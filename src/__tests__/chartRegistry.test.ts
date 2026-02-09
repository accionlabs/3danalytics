import { describe, it, expect, beforeEach } from 'vitest'
import { registerChart, getChartRenderer } from '../registry/chartRegistry.ts'

describe('chartRegistry', () => {
  beforeEach(() => {
    // Registry is a global singleton; registrations persist between tests.
    // For isolation, we test with unique keys.
  })

  it('registers and retrieves a chart component', () => {
    const DummyChart = () => null
    registerChart('test-dummy', DummyChart)
    expect(getChartRenderer('test-dummy')).toBe(DummyChart)
  })

  it('returns undefined for unknown chart type', () => {
    expect(getChartRenderer('nonexistent-type')).toBeUndefined()
  })

  it('overwrites an existing registration', () => {
    const First = () => null
    const Second = () => null
    registerChart('test-overwrite', First)
    registerChart('test-overwrite', Second)
    expect(getChartRenderer('test-overwrite')).toBe(Second)
  })
})
