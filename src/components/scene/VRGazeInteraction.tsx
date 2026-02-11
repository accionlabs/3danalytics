import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'

/**
 * VR Gaze Interaction - detects which panel the user is looking at and enables trigger selection.
 * Provides visual feedback by highlighting the gazed panel.
 */
export function VRGazeInteraction() {
  const { camera, scene } = useThree()
  const { session } = useXR()
  const raycaster = useRef(new THREE.Raycaster())
  const lastGazedPanelId = useRef<string | null>(null)
  const triggerPressed = useRef(false)

  useFrame(() => {
    if (!session) return

    // Set up raycaster from camera (user's gaze)
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)

    // Find intersected objects
    const intersects = raycaster.current.intersectObjects(scene.children, true)

    let gazedPanelId: string | null = null

    // Find the first panel mesh that was intersected
    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object

      // Traverse up to find the panel group with userData
      while (obj) {
        if (obj.userData.panelId) {
          gazedPanelId = obj.userData.panelId
          break
        }
        obj = obj.parent
      }

      if (gazedPanelId) break
    }

    // Update gaze state
    if (gazedPanelId !== lastGazedPanelId.current) {
      if (lastGazedPanelId.current) {
        // Unhighlight previous panel
        const prevPanel = scene.getObjectByName(`panel-${lastGazedPanelId.current}`)
        if (prevPanel) {
          prevPanel.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              const mat = child.material as THREE.MeshBasicMaterial
              mat.opacity = child.userData.originalOpacity || 0.9
            }
          })
        }
      }

      if (gazedPanelId) {
        // Highlight current panel by making it brighter
        const panel = scene.getObjectByName(`panel-${gazedPanelId}`)
        if (panel) {
          panel.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              const mat = child.material as THREE.MeshBasicMaterial
              if (!child.userData.originalOpacity) {
                child.userData.originalOpacity = mat.opacity
              }
              mat.opacity = 1.0 // Full brightness for gazed panel
            }
          })
        }
      }

      lastGazedPanelId.current = gazedPanelId
    }

    // Check for trigger press on any controller
    if (session.inputSources) {
      for (const inputSource of session.inputSources) {
        if (inputSource.gamepad) {
          const gamepad = inputSource.gamepad
          // Trigger is usually button 0
          const triggerButton = gamepad.buttons[0]

          if (triggerButton && triggerButton.pressed && !triggerPressed.current) {
            triggerPressed.current = true

            // Select the gazed panel
            if (gazedPanelId) {
              console.log('[VR GAZE] Panel selected:', gazedPanelId)
              useDashboardStore.getState().focusPanel(gazedPanelId)
            }
          } else if (!triggerButton?.pressed) {
            triggerPressed.current = false
          }
        }
      }
    }
  })

  useEffect(() => {
    console.log('[VR GAZE] Gaze interaction enabled - look at panels and pull trigger to select')
  }, [])

  return null
}
