import { Line, Cone } from '@react-three/drei'
import type { CausalLink, PanelPosition } from '../../types/index.ts'

interface ConnectorsProps {
  links: CausalLink[]
  positionMap: Map<string, PanelPosition>
}

const LINK_STYLES: Record<CausalLink['type'], { color: string; lineWidth: number; dashed: boolean }> = {
  causal:    { color: '#3b82f6', lineWidth: 2, dashed: false },
  segment:   { color: '#10b981', lineWidth: 1, dashed: false },
  hierarchy: { color: '#f59e0b', lineWidth: 1, dashed: true },
}

export function Connectors({ links, positionMap }: ConnectorsProps) {
  return (
    <>
      {links.map((link) => {
        const fromPos = positionMap.get(link.from)
        const toPos = positionMap.get(link.to)
        if (!fromPos || !toPos) return null

        const style = LINK_STYLES[link.type]
        const from = fromPos.position
        const to = toPos.position

        // Midpoint for arrow head placement
        const mid: [number, number, number] = [
          (from[0] + to[0]) / 2,
          (from[1] + to[1]) / 2,
          (from[2] + to[2]) / 2,
        ]

        // Direction vector for arrow orientation
        const dx = to[0] - from[0]
        const dy = to[1] - from[1]
        const dz = to[2] - from[2]
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz)

        return (
          <group key={`${link.from}-${link.to}-${link.type}`}>
            <Line
              points={[from, to]}
              color={style.color}
              lineWidth={style.lineWidth}
              dashed={style.dashed}
              dashSize={0.3}
              gapSize={0.2}
              opacity={0.6}
              transparent
            />
            {/* Arrow head for causal links */}
            {link.type === 'causal' && len > 0 && (
              <group position={mid}>
                <Cone
                  args={[0.12, 0.3, 6]}
                  rotation={[
                    Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)),
                    Math.atan2(dx, dz),
                    0,
                  ]}
                >
                  <meshBasicMaterial color={style.color} opacity={0.7} transparent />
                </Cone>
              </group>
            )}
          </group>
        )
      })}
    </>
  )
}
