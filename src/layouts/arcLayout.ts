import type { PanelConfig, PanelPosition } from '../types/index.ts'

/**
 * Arc layout: panels arranged on a 180° semicircle facing inward.
 * Camera sits at the origin, panels fan out around it.
 */
export function arcLayout(
  panels: PanelConfig[],
  radius = 8,
): PanelPosition[] {
  const count = panels.length
  if (count === 0) return []

  const totalArc = Math.PI // 180 degrees
  const step = totalArc / (count + 1)

  return panels.map((_, i) => {
    // Angle from -90° to +90° (left to right)
    const angle = -totalArc / 2 + step * (i + 1)

    const x = Math.sin(angle) * radius
    const z = -Math.cos(angle) * radius
    const rotY = angle // face toward origin

    return {
      position: [x, 0, z] as [number, number, number],
      rotation: [0, rotY, 0] as [number, number, number],
      scale: 1,
    }
  })
}
