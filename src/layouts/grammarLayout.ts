import type { PanelConfig, PanelPosition } from '../types/index.ts'

const X_SPACING = 4
const Y_SPACING = 3
export const Z_SPACING = 4
const Z_BASE = -8

/**
 * Grammar layout: positions panels in 3D space according to their semantic address.
 *
 * X = processStep (pipeline flow, left-to-right)
 * Y = segment (vertical stacking)
 * Z = detailLevel (depth — summary near, detail far)
 *
 * All panels face the camera (rotation = [0, 0, 0]).
 */
export function grammarLayout(panels: PanelConfig[]): PanelPosition[] {
  if (panels.length === 0) return []

  // Find max processStep to center the X-axis
  const maxStep = Math.max(...panels.map((p) => p.semantic.processStep))

  // Find max segment to center the Y-axis
  const segmentValues = panels
    .map((p) => p.semantic.segment)
    .filter((s): s is number => s !== null)
  const maxSegment = segmentValues.length > 0 ? Math.max(...segmentValues) : 0

  return panels.map((panel) => {
    const { processStep, segment, detailLevel } = panel.semantic

    const x = processStep * X_SPACING - (maxStep * X_SPACING) / 2
    const y = ((segment ?? 0) * Y_SPACING) - (maxSegment * Y_SPACING) / 2
    const z = Z_BASE - detailLevel * Z_SPACING

    return {
      position: [x, y, z] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: 1,
    }
  })
}
