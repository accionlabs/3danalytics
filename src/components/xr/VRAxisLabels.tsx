import { useMemo } from 'react'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { grammarLayout } from '../../layouts/grammarLayout.ts'

/**
 * Create a CanvasTexture with text rendered on it.
 * Replaces drei <Text> which breaks XR rendering.
 */
function makeTextTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  const w = 512
  const h = 64
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = color
  ctx.font = 'bold 32px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/**
 * World-space text labels at axis boundaries.
 * Shows processLabels along X and segmentLabels along Y.
 *
 * NOTE: Uses CanvasTexture on plane meshes instead of drei <Text>,
 * which breaks XR rendering (scene moves with user's head).
 */
export function VRAxisLabels() {
  const panels = useDashboardStore((s) => s.panels)

  const labels = useMemo(() => {
    if (!panels.length) return []

    const positions = grammarLayout(panels)
    const result: { text: string; position: [number, number, number]; axis: 'x' | 'y' }[] = []
    const seenProcess = new Set<number>()
    const seenSegment = new Set<number>()

    panels.forEach((panel, i) => {
      const pos = positions[i].position

      // X-axis: processLabel at top of each column
      if (panel.processLabel && !seenProcess.has(panel.semantic.processStep)) {
        seenProcess.add(panel.semantic.processStep)
        const columnPanels = panels
          .map((p, j) => ({ p, pos: positions[j].position }))
          .filter(({ p }) => p.semantic.processStep === panel.semantic.processStep)
        const maxY = Math.max(...columnPanels.map(({ pos: p }) => p[1]))
        result.push({
          text: panel.processLabel,
          position: [pos[0], maxY + 0.8, pos[2]],
          axis: 'x',
        })
      }

      // Y-axis: segmentLabel at left of each row
      if (panel.segmentLabel && panel.semantic.segment != null && !seenSegment.has(panel.semantic.segment)) {
        seenSegment.add(panel.semantic.segment)
        const rowPanels = panels
          .map((p, j) => ({ p, pos: positions[j].position }))
          .filter(({ p }) => p.semantic.segment === panel.semantic.segment)
        const minX = Math.min(...rowPanels.map(({ pos: p }) => p[0]))
        result.push({
          text: panel.segmentLabel,
          position: [minX - 1.2, pos[1], pos[2]],
          axis: 'y',
        })
      }
    })

    return result
  }, [panels])

  // Memoize textures so they don't regenerate every render
  const textures = useMemo(
    () => labels.map((l) => makeTextTexture(l.text, l.axis === 'x' ? '#6090c0' : '#60a060')),
    [labels],
  )

  return (
    <>
      {labels.map((label, i) => (
        <mesh
          key={`${label.axis}-${i}`}
          position={label.position}
        >
          <planeGeometry args={[1.2, 0.15]} />
          <meshBasicMaterial map={textures[i]} transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}
