import type { PanelConfig, PanelPosition } from '../types/index.ts'

/**
 * Room layout: panels distributed across 3 walls (left, front, right) of a virtual gallery.
 */
export function roomLayout(
  panels: PanelConfig[],
  roomWidth = 12,
  roomDepth = 8,
): PanelPosition[] {
  const count = panels.length
  if (count === 0) return []

  // Distribute panels across 3 walls
  const perWall = Math.ceil(count / 3)
  const leftPanels = panels.slice(0, perWall)
  const frontPanels = panels.slice(perWall, perWall * 2)
  const rightPanels = panels.slice(perWall * 2)

  const positions: PanelPosition[] = []
  const halfWidth = roomWidth / 2
  const wallY = 0

  // Left wall: x = -halfWidth, facing right (+x direction), rotation.y = PI/2
  leftPanels.forEach((_, i) => {
    const spacing = roomDepth / (leftPanels.length + 1)
    const z = -roomDepth / 2 + spacing * (i + 1)
    positions.push({
      position: [-halfWidth, wallY, z],
      rotation: [0, Math.PI / 2, 0],
      scale: 1,
    })
  })

  // Front wall: z = -roomDepth/2, facing back (+z direction), rotation.y = 0
  frontPanels.forEach((_, i) => {
    const spacing = roomWidth / (frontPanels.length + 1)
    const x = -halfWidth + spacing * (i + 1)
    positions.push({
      position: [x, wallY, -roomDepth / 2],
      rotation: [0, 0, 0],
      scale: 1,
    })
  })

  // Right wall: x = +halfWidth, facing left (-x direction), rotation.y = -PI/2
  rightPanels.forEach((_, i) => {
    const spacing = roomDepth / (rightPanels.length + 1)
    const z = -roomDepth / 2 + spacing * (i + 1)
    positions.push({
      position: [halfWidth, wallY, z],
      rotation: [0, -Math.PI / 2, 0],
      scale: 1,
    })
  })

  return positions
}
