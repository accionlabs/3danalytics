import { describe, it, expect } from 'vitest'
import { defaultPanels, causalLinks } from '../data/mockData.ts'

describe('grammar mock data', () => {
  it('has 30 panels total (1 dashboard + 5 summary + 15 segment + 9 deep-detail)', () => {
    expect(defaultPanels).toHaveLength(30)
  })

  it('all panels have unique ids', () => {
    const ids = defaultPanels.map((p) => p.id)
    expect(new Set(ids).size).toBe(30)
  })

  it('all panels have semantic addresses', () => {
    for (const panel of defaultPanels) {
      expect(panel.semantic).toBeDefined()
      expect(typeof panel.semantic.processStep).toBe('number')
      expect(typeof panel.semantic.detailLevel).toBe('number')
    }
  })

  it('has 1 Z=0 root dashboard panel', () => {
    const root = defaultPanels.filter((p) => p.semantic.detailLevel === 0)
    expect(root).toHaveLength(1)
    expect(root[0].id).toBe('dashboard')
  })

  it('has 5 Z=1 pipeline summary panels', () => {
    const summaries = defaultPanels.filter((p) => p.semantic.detailLevel === 1)
    expect(summaries).toHaveLength(5)
  })

  it('Z=1 panels span processStep 0-4', () => {
    const summaries = defaultPanels.filter((p) => p.semantic.detailLevel === 1)
    const steps = summaries.map((p) => p.semantic.processStep).sort()
    expect(steps).toEqual([0, 1, 2, 3, 4])
  })

  it('Z=1 panels are children of the dashboard', () => {
    const summaries = defaultPanels.filter((p) => p.semantic.detailLevel === 1)
    for (const s of summaries) {
      expect(s.parentId).toBe('dashboard')
    }
  })

  it('has 15 Z=2 segment panels (3 segments x 5 steps)', () => {
    const details = defaultPanels.filter((p) => p.semantic.detailLevel === 2)
    expect(details).toHaveLength(15)
  })

  it('Z=2 panels cover all 5 pipeline steps for each segment', () => {
    const z2 = defaultPanels.filter((p) => p.semantic.detailLevel === 2)
    for (const seg of [0, 1, 2]) {
      const steps = z2
        .filter((p) => p.semantic.segment === seg)
        .map((p) => p.semantic.processStep)
        .sort()
      expect(steps).toEqual([0, 1, 2, 3, 4])
    }
  })

  it('has 9 Z=3 deep-detail panels', () => {
    const deep = defaultPanels.filter((p) => p.semantic.detailLevel === 3)
    expect(deep).toHaveLength(9)
  })

  it('Z=3 panels have valid parentId pointing to Z=2 panels', () => {
    const z2Ids = new Set(
      defaultPanels.filter((p) => p.semantic.detailLevel === 2).map((p) => p.id),
    )
    const deep = defaultPanels.filter((p) => p.semantic.detailLevel === 3)
    for (const d of deep) {
      expect(d.parentId).toBeDefined()
      expect(z2Ids.has(d.parentId!)).toBe(true)
    }
  })

  it('all non-root panels have valid parentId', () => {
    const ids = new Set(defaultPanels.map((p) => p.id))
    const nonRoot = defaultPanels.filter((p) => p.semantic.detailLevel >= 1)
    for (const d of nonRoot) {
      expect(d.parentId).toBeDefined()
      expect(ids.has(d.parentId!)).toBe(true)
    }
  })

  it('segment panels have segmentLabel', () => {
    const details = defaultPanels.filter((p) => p.semantic.detailLevel >= 2)
    const validLabels = ['Startup', 'SMB', 'Enterprise']
    for (const d of details) {
      expect(d.segmentLabel).toBeDefined()
      expect(validLabels).toContain(d.segmentLabel)
    }
  })

  it('all panels have valid chartType and data', () => {
    for (const panel of defaultPanels) {
      expect(panel.chartType).toBeTruthy()
      expect(panel.data).toBeDefined()
      expect(panel.size.width).toBeGreaterThan(0)
      expect(panel.size.height).toBeGreaterThan(0)
    }
  })

  it('all panels have processLabel', () => {
    for (const panel of defaultPanels) {
      expect(panel.processLabel).toBeDefined()
      expect(panel.processLabel!.length).toBeGreaterThan(0)
    }
  })

  describe('causal links', () => {
    it('has 61 total links', () => {
      expect(causalLinks).toHaveLength(61)
    })

    it('all link references point to existing panels', () => {
      const ids = new Set(defaultPanels.map((p) => p.id))
      for (const link of causalLinks) {
        expect(ids.has(link.from)).toBe(true)
        expect(ids.has(link.to)).toBe(true)
      }
    })

    it('has 16 causal (X-axis) links (4 at Z=1 + 12 at Z=2)', () => {
      const causal = causalLinks.filter((l) => l.type === 'causal')
      expect(causal).toHaveLength(16)
    })

    it('has 29 hierarchy (Z-axis) links (5 Z=0→Z=1 + 15 Z=1→Z=2 + 9 Z=2→Z=3)', () => {
      const hierarchy = causalLinks.filter((l) => l.type === 'hierarchy')
      expect(hierarchy).toHaveLength(29)
    })

    it('has 16 segment (Y-axis) links (5 steps × 2 at Z=2 + 3×2 at Z=3)', () => {
      const segment = causalLinks.filter((l) => l.type === 'segment')
      expect(segment).toHaveLength(16)
    })

    it('link types are valid', () => {
      const validTypes = ['causal', 'segment', 'hierarchy']
      for (const link of causalLinks) {
        expect(validTypes).toContain(link.type)
      }
    })
  })
})
