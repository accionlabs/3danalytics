import { useXR } from '@react-three/xr'

/**
 * Returns true when an XR session (immersive-vr or immersive-ar) is active.
 * Must be called inside an <XR> provider.
 */
export function useXRSession(): { isInXR: boolean } {
  const mode = useXR((s) => s.mode)
  return { isInXR: mode != null }
}
