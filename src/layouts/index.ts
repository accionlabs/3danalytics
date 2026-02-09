import type { PanelConfig, PanelPosition, LayoutType } from '../types/index.ts'
import { arcLayout } from './arcLayout.ts'
import { gridLayout } from './gridLayout.ts'
import { roomLayout } from './roomLayout.ts'

type LayoutFn = (panels: PanelConfig[]) => PanelPosition[]

const layoutRegistry: Record<LayoutType, LayoutFn> = {
  arc: arcLayout,
  grid: gridLayout,
  room: roomLayout,
}

export function computeLayout(
  panels: PanelConfig[],
  layout: LayoutType,
): PanelPosition[] {
  const fn = layoutRegistry[layout]
  return fn(panels)
}
