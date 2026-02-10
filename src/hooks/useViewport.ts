import { useState, useEffect } from 'react'

/** Reference width at which uiScale = 1.0 (desktop baseline) */
const UI_SCALE_REF = 1200
/** Minimum uiScale so chrome never gets too tiny */
const UI_SCALE_MIN = 0.65

interface ViewportInfo {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  /** Continuous 0.65–1.0 scale factor for CSS transform scaling of chrome */
  uiScale: number
}

export function useViewport(): ViewportInfo {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    let rafId = 0
    const handleResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight })
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return {
    width: size.width,
    height: size.height,
    isMobile: size.width < 640,
    isTablet: size.width >= 640 && size.width <= 1024,
    isDesktop: size.width > 1024,
    uiScale: Math.min(1, Math.max(UI_SCALE_MIN, size.width / UI_SCALE_REF)),
  }
}
