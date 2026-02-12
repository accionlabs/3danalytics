import { createXRStore } from '@react-three/xr'

/**
 * Singleton XR store — shared across the app.
 * Configures immersive-vr session with controller and hand tracking.
 */
export const xrStore = createXRStore({
  hand: true,
  controller: true,
  foveation: 1,
  frameRate: 'high',
})
