import { useMemo, useCallback, useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useXR, XROrigin } from '@react-three/xr'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { grammarLayout, Z_SPACING } from '../../layouts/grammarLayout.ts'
import { DashboardPanel } from './DashboardPanel.tsx'
import { VRPanel } from '../xr/VRPanel.tsx'
import { VRNavigation } from '../xr/VRNavigation.tsx'
import { VRHUD } from '../xr/VRHUD.tsx'
import { VRAxisLabels } from '../xr/VRAxisLabels.tsx'
import { VRComfortVignette } from '../xr/VRComfortVignette.tsx'
import { VRSpeechButton } from '../xr/VRSpeechButton.tsx'
import { CameraController, fitIdealDistance } from './CameraController.tsx'
import { Environment } from './Environment.tsx'
import { PostProcessing } from './PostProcessing.tsx'
import { Connectors } from './Connectors.tsx'
import { useXRSession } from '../../xr/useXRSession.ts'

/** Debug display in VR — colored boxes encode XR state as colors */
function VRDebugDisplay() {
  const xrMode = useXR((s) => s.mode)
  const gl = useThree((s) => s.gl)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const posRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ camera }) => {
    // Left box: green if presenting, red if not
    if (matRef.current) {
      matRef.current.color.set(gl.xr.isPresenting ? '#00ff00' : '#ff0000')
    }
    // Right box: blue if camera is ArrayCamera, yellow if PerspectiveCamera
    if (posRef.current) {
      posRef.current.color.set(camera.type === 'ArrayCamera' ? '#0088ff' : '#ffff00')
    }
  })

  return (
    <group position={[0, 3, 0]}>
      {/* Large banner box so we can see something */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 0.5, 0.1]} />
        <meshBasicMaterial color="#1a1a3a" />
      </mesh>

      {/* Left indicator: green=presenting, red=not presenting */}
      <mesh position={[-1.2, 0, 0.06]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshBasicMaterial ref={matRef} color="#ff0000" />
      </mesh>

      {/* Right indicator: blue=ArrayCamera(XR), yellow=PerspectiveCamera(desktop) */}
      <mesh position={[1.2, 0, 0.06]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshBasicMaterial ref={posRef} color="#ffff00" />
      </mesh>

      {/* Mode indicator: cyan=immersive-vr, magenta=other */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshBasicMaterial color={xrMode === 'immersive-vr' ? '#00ffff' : '#ff00ff'} />
      </mesh>
    </group>
  )
}

/** Default distanceFactor (matches DashboardPanel's DEFAULT_DF) */
const DEFAULT_DF = 2
/** Max camera offset before nearer Z-layer occludes — must match CameraController */
const MAX_OFFSET = Z_SPACING - 0.5

export function DashboardScene() {
  const { isInXR } = useXRSession()
  const panels = useDashboardStore((s) => s.panels)
  const causalLinks = useDashboardStore((s) => s.causalLinks)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)
  const setInVR = useDashboardStore((s) => s.setInVR)
  const gl = useThree((s) => s.gl)

  // Track VR mode in store for voice command handling
  useEffect(() => {
    setInVR(isInXR)
  }, [isInXR, setInVR])

  void gl // suppress unused warning — gl is accessed via useThree() below

  // Compute distanceFactor: when the camera distance is capped by Z_SPACING,
  // reduce df so the panel still fills 85% of the usable viewport.
  // fill = (panel.size * df/DEFAULT_DF) / (2 * d * tan(fov/2) * aspect * frac)
  // Keeping fill constant: df_new/d_new = df_old/d_old → df_new = DEFAULT_DF * d_capped/d_ideal
  const { size, camera: threeCamera } = useThree()
  const focusedPanel = focusedPanelId ? panels.find((p) => p.id === focusedPanelId) : undefined
  const panelDf = (() => {
    if (!focusedPanel) return DEFAULT_DF
    const fov = (threeCamera as THREE.PerspectiveCamera).fov
    const idealDist = fitIdealDistance(
      focusedPanel.size.width, focusedPanel.size.height,
      size.width, size.height, fov,
    )
    // Z=0 has nothing in front — no cap needed
    if (focusedPanel.semantic.detailLevel === 0) return DEFAULT_DF
    if (idealDist <= MAX_OFFSET) return DEFAULT_DF
    // Camera is capped: shrink df proportionally to preserve 85% fill
    return DEFAULT_DF * MAX_OFFSET / idealDist
  })()

  // Compute positions for ALL panels
  const allPositions = useMemo(() => grammarLayout(panels), [panels])

  // Build position map: panelId → PanelPosition
  const positionMap = useMemo(() => {
    const map = new Map<string, (typeof allPositions)[number]>()
    panels.forEach((p, i) => map.set(p.id, allPositions[i]))
    return map
  }, [panels, allPositions])

  // Build map: parentId → sorted child panel IDs
  const childMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const p of panels) {
      if (!p.parentId) continue
      const siblings = map.get(p.parentId) ?? []
      siblings.push(p.id)
      map.set(p.parentId, siblings)
    }
    // Sort children by processStep (X) for Z=0→Z=1, by segment (Y) for Z=1→Z=2
    for (const [parentId, children] of map) {
      const parent = panels.find((p) => p.id === parentId)
      children.sort((a, b) => {
        const pa = panels.find((p) => p.id === a)!
        const pb = panels.find((p) => p.id === b)!
        if (parent?.semantic.detailLevel === 0) return pa.semantic.processStep - pb.semantic.processStep
        return (pa.semantic.segment ?? 0) - (pb.semantic.segment ?? 0)
      })
    }
    return map
  }, [panels])

  // After any drill/focus, blur the active HTML element so keyboard and
  // pointer events return to the canvas instead of staying trapped in
  // the drei <Html> overlay that was clicked.
  const blurAndFocus = useCallback(
    (targetId: string) => {
      focusPanel(targetId)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    },
    [focusPanel],
  )

  const handleItemClick = useCallback(
    (panelId: string, index: number) => {
      const children = childMap.get(panelId)
      const childId = children?.[index]
      if (childId) blurAndFocus(childId)
    },
    [childMap, blurAndFocus],
  )

  // When a focused panel is clicked again, drill to its first child
  const handlePanelClick = useCallback(
    (panelId: string) => {
      if (focusedPanelId === panelId) {
        const children = childMap.get(panelId)
        if (children?.length) {
          blurAndFocus(children[0])
          return
        }
      }
      blurAndFocus(panelId)
    },
    [focusedPanelId, childMap, blurAndFocus],
  )

  // VR mode: world content inside VRNavigation's offset group.
  // NOTE: drei <Text> (troika-three-text) breaks XR rendering — all text
  // uses CanvasTexture on plane meshes instead.
  if (isInXR) {
    // VR-specific adjustments for comfortable viewing
    // Lift panels to eye level and position at comfortable distance
    const VR_Y_OFFSET = 0.5   // Lift panels 0.5m above center for comfortable viewing
    const VR_Z_OFFSET = -2    // Push panels further back for comfortable viewing distance (3-5m)

    // VR Group Positioning Strategy:
    // - Radial/Arc Layout: Groups are positioned in a circular arc around the user
    // - Group 0: Front (0°), Group 1: Front-left (-60°), Group 2: Front-right (+60°), etc.
    // - Each group maintains its internal grammarLayout semantic structure
    const vrPositionMap = new Map<string, (typeof allPositions)[number]>();
    const uniqueGroups = [...new Set(panels.map(p => p.visualizationGroupId ?? 0))];

    console.log('[VR Groups] DEBUG:', {
      totalPanels: panels.length,
      uniqueGroups: uniqueGroups,
      groupCount: uniqueGroups.length
    });

    // Only apply arc positioning if there are multiple groups
    if (uniqueGroups.length === 1 && uniqueGroups[0] === 0) {
      console.log('[VR Groups] Single group mode - using simple offset');
      // Single group (original panels) - use simple offset (original behavior)
      positionMap.forEach((pos, id) => {
        vrPositionMap.set(id, {
          position: [
            pos.position[0],
            pos.position[1] + VR_Y_OFFSET,
            pos.position[2] + VR_Z_OFFSET
          ] as [number, number, number],
          rotation: pos.rotation,
          scale: pos.scale
        });
      });
    } else {
      console.log('[VR Groups] Multi-group mode - using CENTERED radial positioning');

      // Sort groups to get consistent ordering (0, 1, 2, ...)
      const sortedGroups = [...uniqueGroups].sort((a, b) => a - b);
      console.log('[VR Groups] Sorted groups:', sortedGroups);

      // Step 1: Calculate the center X position of each group's panels
      // This ensures symmetric positioning regardless of grammarLayout offsets
      const groupCentersX = new Map<number, number>();
      for (const groupId of uniqueGroups) {
        const groupPanelIds = panels
          .filter(p => (p.visualizationGroupId ?? 0) === groupId)
          .map(p => p.id);
        const groupXPositions = groupPanelIds
          .map(id => positionMap.get(id)?.position[0] ?? 0);
        const centerX = groupXPositions.length > 0
          ? groupXPositions.reduce((a, b) => a + b, 0) / groupXPositions.length
          : 0;
        groupCentersX.set(groupId, centerX);
        console.log(`[VR Groups] Group ${groupId} center X: ${centerX}`);
      }

      // Step 2: Define group transforms (position + rotation)
      // Groups are arranged in an arc: front, left, right
      const GROUP_DISTANCE = 8;  // Distance from user for side groups (increased for more separation)
      const GROUP_ANGLE = 85;    // Angle in degrees from center (closer to 90° for clear left/right)

      const getGroupTransform = (groupId: number) => {
        const groupIndex = sortedGroups.indexOf(groupId);

        if (groupIndex === 0) {
          // First group: Front center
          return { offsetX: 0, offsetZ: 0, rotationY: 0 };
        }
        if (groupIndex === 1) {
          // Second group: Left
          const angleRad = -GROUP_ANGLE * Math.PI / 180;
          return {
            offsetX: Math.sin(angleRad) * GROUP_DISTANCE,  // Negative (left)
            offsetZ: (Math.cos(angleRad) - 1) * GROUP_DISTANCE,  // Slight Z adjustment
            rotationY: -angleRad  // Rotate to face user
          };
        }
        if (groupIndex === 2) {
          // Third group: Right
          const angleRad = GROUP_ANGLE * Math.PI / 180;
          return {
            offsetX: Math.sin(angleRad) * GROUP_DISTANCE,  // Positive (right)
            offsetZ: (Math.cos(angleRad) - 1) * GROUP_DISTANCE,  // Slight Z adjustment
            rotationY: -angleRad  // Rotate to face user
          };
        }
        return { offsetX: 0, offsetZ: 0, rotationY: 0 };
      };

      // Step 3: Position each panel
      // For side groups, position panels along their LOCAL depth axis (not world Z)
      // This ensures summary cards appear in front of detail views after rotation
      const SIDE_GROUP_BASE_Z = -3;  // Base Z position for side groups

      positionMap.forEach((pos, id) => {
        const panel = panels.find(p => p.id === id);
        const groupId = panel?.visualizationGroupId ?? 0;
        const groupIndex = sortedGroups.indexOf(groupId);
        const groupCenterX = groupCentersX.get(groupId) ?? 0;
        const transform = getGroupTransform(groupId);

        // Calculate panel position relative to its group center
        const relativeX = pos.position[0] - groupCenterX;
        const relativeY = pos.position[1];
        const relativeZ = pos.position[2];  // grammarLayout Z (0 for summary, negative for details)

        let finalX: number;
        let finalY: number;
        let finalZ: number;

        if (groupIndex === 0) {
          // Main group: Keep grammarLayout Z positions (detail levels)
          finalX = relativeX + transform.offsetX;
          finalY = relativeY + VR_Y_OFFSET;
          finalZ = relativeZ + VR_Z_OFFSET;
        } else {
          // Side groups: Position panels along their LOCAL depth axis
          // relativeZ: 0 for summary (detailLevel 0), negative for details (detailLevel 1+)
          // We flip the sign so summary is closer to user after rotation
          const localDepth = -relativeZ;  // Flip: summary=0, detail=+4 (further from panel surface)

          // Get the rotation angle for this group
          const angleRad = groupIndex === 1
            ? -GROUP_ANGLE * Math.PI / 180
            : GROUP_ANGLE * Math.PI / 180;

          // Position along the panel's facing direction (local -Z becomes world offset)
          // For left group (angle=-85°): sin=-0.996, cos=0.087
          // Detail panels (localDepth=4) will be at X offset = -3.98 (further from user)
          const depthOffsetX = Math.sin(angleRad) * localDepth;
          const depthOffsetZ = -Math.cos(angleRad) * localDepth;

          finalX = relativeX + transform.offsetX + depthOffsetX;
          finalY = relativeY + VR_Y_OFFSET;
          finalZ = SIDE_GROUP_BASE_Z + depthOffsetZ;
        }

        console.log(`[VR Position] Panel ${id}: groupId=${groupId}, groupIndex=${groupIndex}, finalX=${finalX.toFixed(2)}, finalZ=${finalZ.toFixed(2)}`);

        vrPositionMap.set(id, {
          position: [finalX, finalY, finalZ] as [number, number, number],
          rotation: [0, transform.rotationY, 0] as [number, number, number],
          scale: pos.scale
        });
      });
    }

    return (
      <>
        <XROrigin position={[0, 0, 0]} />
        <VRNavigation>
          <VRDebugDisplay />
          <Environment />
          <VRAxisLabels yOffset={VR_Y_OFFSET} zOffset={VR_Z_OFFSET} />
          {panels.map((panel) => {
            const vrPos = vrPositionMap.get(panel.id)
            if (!vrPos) return null

            return (
              <VRPanel
                key={panel.id}
                config={panel}
                position={vrPos.position}
                rotation={vrPos.rotation}
                isDimmed={focusedPanelId !== null && focusedPanelId !== panel.id}
                onClick={() => handlePanelClick(panel.id)}
              />
            )
          })}
          <Connectors links={causalLinks} positionMap={vrPositionMap} />
          <VRHUD />
        </VRNavigation>
        <VRSpeechButton />
        <VRComfortVignette />
        <PostProcessing />
      </>
    )
  }

  // Desktop mode: unchanged
  return (
    <>
      <CameraController />
      <Environment />

      {panels.map((panel) => {
        const pos = positionMap.get(panel.id)
        if (!pos) return null
        return (
          <DashboardPanel
            key={panel.id}
            config={panel}
            target={pos}
            isDimmed={focusedPanelId !== null && focusedPanelId !== panel.id}
            onFocus={() => handlePanelClick(panel.id)}
            onItemClick={childMap.has(panel.id) ? (i) => handleItemClick(panel.id, i) : undefined}
            onDrillTo={blurAndFocus}
            distanceFactor={panelDf}
          />
        )
      })}

      <Connectors links={causalLinks} positionMap={positionMap} />

      <PostProcessing />
    </>
  )
}
