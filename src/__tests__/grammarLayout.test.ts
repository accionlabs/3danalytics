import { describe, it, expect } from 'vitest'
import { grammarLayout } from '../layouts/grammarLayout.ts'
import type { PanelConfig } from '../types/index.ts'

function makePanel(overrides: Partial<PanelConfig> & { id: string; semantic: PanelConfig['semantic'] }): PanelConfig {
  return {
    title: overrides.id,
    chartType: 'test',
    size: { width: 3, height: 2 },
    data: {},
    ...overrides,
  }
}

describe('grammarLayout', () => {
  it('returns empty array for empty input', () => {
    expect(grammarLayout([])).toEqual([])
  })

  it('returns correct number of positions', () => {
    const panels = [
      makePanel({ id: 'a', semantic: { processStep: 0, segment: null, detailLevel: 0 } }),
      makePanel({ id: 'b', semantic: { processStep: 1, segment: null, detailLevel: 0 } }),
      makePanel({ id: 'c', semantic: { processStep: 2, segment: null, detailLevel: 0 } }),
    ]
    expect(grammarLayout(panels)).toHaveLength(3)
  })

  it('X-axis: panels spread horizontally by processStep', () => {
    const panels = [
      makePanel({ id: 'a', semantic: { processStep: 0, segment: null, detailLevel: 0 } }),
      makePanel({ id: 'b', semantic: { processStep: 1, segment: null, detailLevel: 0 } }),
      makePanel({ id: 'c', semantic: { processStep: 2, segment: null, detailLevel: 0 } }),
    ]
    const positions = grammarLayout(panels)

    // X should be increasing left to right
    expect(positions[0].position[0]).toBeLessThan(positions[1].position[0])
    expect(positions[1].position[0]).toBeLessThan(positions[2].position[0])
  })

  it('Y-axis: panels spread vertically by segment', () => {
    const panels = [
      makePanel({ id: 'a', semantic: { processStep: 0, segment: 0, detailLevel: 0 } }),
      makePanel({ id: 'b', semantic: { processStep: 0, segment: 1, detailLevel: 0 } }),
      makePanel({ id: 'c', semantic: { processStep: 0, segment: 2, detailLevel: 0 } }),
    ]
    const positions = grammarLayout(panels)

    // Y should be increasing
    expect(positions[0].position[1]).toBeLessThan(positions[1].position[1])
    expect(positions[1].position[1]).toBeLessThan(positions[2].position[1])
  })

  it('Z-axis: deeper detail levels are further away (more negative Z)', () => {
    const panels = [
      makePanel({ id: 'a', semantic: { processStep: 0, segment: null, detailLevel: 0 } }),
      makePanel({ id: 'b', semantic: { processStep: 0, segment: null, detailLevel: 1 } }),
    ]
    const positions = grammarLayout(panels)

    // Z=1 should be further back (more negative) than Z=0
    expect(positions[1].position[2]).toBeLessThan(positions[0].position[2])
  })

  it('all panels face the camera (rotation = [0,0,0])', () => {
    const panels = [
      makePanel({ id: 'a', semantic: { processStep: 0, segment: null, detailLevel: 0 } }),
      makePanel({ id: 'b', semantic: { processStep: 1, segment: 1, detailLevel: 1 } }),
    ]
    const positions = grammarLayout(panels)

    for (const pos of positions) {
      expect(pos.rotation).toEqual([0, 0, 0])
    }
  })

  it('all panels have scale = 1', () => {
    const panels = [
      makePanel({ id: 'a', semantic: { processStep: 0, segment: null, detailLevel: 0 } }),
    ]
    const positions = grammarLayout(panels)
    expect(positions[0].scale).toBe(1)
  })

  it('X-axis is centered around 0', () => {
    const panels = [
      makePanel({ id: 'a', semantic: { processStep: 0, segment: null, detailLevel: 0 } }),
      makePanel({ id: 'b', semantic: { processStep: 2, segment: null, detailLevel: 0 } }),
    ]
    const positions = grammarLayout(panels)

    // With processSteps 0 and 2, center should be at processStep 1
    // So panel 0 should be negative X, panel 2 should be positive X
    expect(positions[0].position[0]).toBeLessThan(0)
    expect(positions[1].position[0]).toBeGreaterThan(0)
  })
})
