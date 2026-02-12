import type { ReactNode } from 'react'
import { useVRNavigation } from '../../hooks/useVRNavigation.ts'
import { XRTeleport } from './XRTeleport.tsx'

/**
 * VR navigation controller — wires thumbstick/button input to store actions
 * and wraps scene content in XRTeleport's world-offset group.
 *
 * Mounted in DashboardScene when isInXR is true.
 */
export function VRNavigation({ children }: { children?: ReactNode }) {
  useVRNavigation()
  return <XRTeleport>{children}</XRTeleport>
}
