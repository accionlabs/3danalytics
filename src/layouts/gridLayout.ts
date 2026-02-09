import type { PanelConfig, PanelPosition } from '../types/index.ts'

/**
 * Grid layout: panels on a concave cylindrical surface.
 * Multiple columns and rows, each panel facing the cylinder center.
 */
export function gridLayout(
  panels: PanelConfig[],
  columns = 3,
  radius = 10,
): PanelPosition[] {
  const count = panels.length
  if (count === 0) return []

  const rows = Math.ceil(count / columns)
  const colSpacing = 0.6 // angular spacing between columns (radians)
  const rowSpacing = 2.5

  return panels.map((_, i) => {
    const col = i % columns
    const row = Math.floor(i / columns)

    // Center the columns around 0
    const colOffset = (col - (columns - 1) / 2) * colSpacing
    const rowOffset = ((rows - 1) / 2 - row) * rowSpacing

    const x = Math.sin(colOffset) * radius
    const z = -Math.cos(colOffset) * radius
    const rotY = colOffset // face toward center

    return {
      position: [x, rowOffset, z] as [number, number, number],
      rotation: [0, rotY, 0] as [number, number, number],
      scale: 1,
    }
  })
}
