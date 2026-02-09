import { describe, it, expect } from 'vitest'
import { arcLayout } from '../layouts/arcLayout.ts'
import { gridLayout } from '../layouts/gridLayout.ts'
import { roomLayout } from '../layouts/roomLayout.ts'
import { computeLayout } from '../layouts/index.ts'
import type { PanelConfig } from '../types/index.ts'

function makePanels(n: number): PanelConfig[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    title: `Panel ${i}`,
    chartType: 'test',
    size: { width: 3, height: 2 },
    data: {},
  }))
}

describe('arcLayout', () => {
  it('returns empty array for empty input', () => {
    expect(arcLayout([])).toEqual([])
  })

  it('returns correct number of positions', () => {
    const panels = makePanels(7)
    const positions = arcLayout(panels)
    expect(positions).toHaveLength(7)
  })

  it('places panels on a semicircle', () => {
    const panels = makePanels(5)
    const positions = arcLayout(panels, 8)

    for (const pos of positions) {
      const [x, , z] = pos.position
      const distFromOrigin = Math.sqrt(x * x + z * z)
      // Should be approximately at radius distance
      expect(distFromOrigin).toBeCloseTo(8, 0)
    }
  })

  it('panels face toward center', () => {
    const panels = makePanels(3)
    const positions = arcLayout(panels, 8)

    // Each panel's rotation.y should equal its angle
    for (const pos of positions) {
      const [x, , z] = pos.position
      const expectedAngle = Math.atan2(x, -z)
      expect(pos.rotation[1]).toBeCloseTo(expectedAngle, 2)
    }
  })
})

describe('gridLayout', () => {
  it('returns empty array for empty input', () => {
    expect(gridLayout([])).toEqual([])
  })

  it('returns correct number of positions', () => {
    const positions = gridLayout(makePanels(9), 3)
    expect(positions).toHaveLength(9)
  })

  it('panels are at cylinder radius distance', () => {
    const positions = gridLayout(makePanels(6), 3, 10)
    for (const pos of positions) {
      const [x, , z] = pos.position
      const dist = Math.sqrt(x * x + z * z)
      expect(dist).toBeCloseTo(10, 0)
    }
  })
})

describe('roomLayout', () => {
  it('returns empty array for empty input', () => {
    expect(roomLayout([])).toEqual([])
  })

  it('returns correct number of positions', () => {
    const positions = roomLayout(makePanels(7))
    expect(positions).toHaveLength(7)
  })

  it('distributes panels across walls', () => {
    const positions = roomLayout(makePanels(6), 12, 8)

    // Left wall panels have x = -6
    const leftWall = positions.filter((p) => p.position[0] === -6)
    expect(leftWall.length).toBeGreaterThan(0)

    // Right wall panels have x = 6
    const rightWall = positions.filter((p) => p.position[0] === 6)
    expect(rightWall.length).toBeGreaterThan(0)
  })
})

describe('computeLayout', () => {
  it('dispatches to correct layout', () => {
    const panels = makePanels(5)

    const arcPositions = computeLayout(panels, 'arc')
    const gridPositions = computeLayout(panels, 'grid')
    const roomPositions = computeLayout(panels, 'room')

    // Each layout returns different positions
    expect(arcPositions).not.toEqual(gridPositions)
    expect(gridPositions).not.toEqual(roomPositions)

    // All return correct count
    expect(arcPositions).toHaveLength(5)
    expect(gridPositions).toHaveLength(5)
    expect(roomPositions).toHaveLength(5)
  })
})
