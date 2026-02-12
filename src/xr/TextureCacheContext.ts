import { useSyncExternalStore } from 'react'
import * as THREE from 'three'

/** Map of panelId → CanvasTexture for VR rendering */
export type TextureCache = Map<string, THREE.CanvasTexture>

/**
 * Module-level texture cache — shared between the DOM tree
 * (OffscreenChartRenderer) and the R3F tree (VRPanel).
 *
 * Uses useSyncExternalStore for React integration so VRPanels
 * re-render when textures are updated.
 */
const cache: TextureCache = new Map()
let version = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): number {
  return version
}

/** Notify React consumers that textures have changed */
export function notifyTextureUpdate(): void {
  version++
  for (const listener of listeners) {
    listener()
  }
}

/** Get the raw texture cache map */
export function getTextureCache(): TextureCache {
  return cache
}

/**
 * React hook — returns the texture cache and re-renders when it changes.
 * Safe to use in both DOM and R3F component trees.
 */
export function useTextureCache(): TextureCache {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return cache
}
