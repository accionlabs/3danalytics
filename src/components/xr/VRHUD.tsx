import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDashboardStore } from '../../store/dashboardStore.ts';
import { getTextureCache } from '../../xr/TextureCacheContext.ts';
import { grammarLayout } from '../../layouts/grammarLayout.ts';

/**
 * VR head-up display — shows breadcrumb navigation + debug info.
 *
 * Uses CanvasTexture on a plane mesh instead of drei <Text>,
 * which breaks XR rendering (scene moves with user's head).
 *
 * Positioned below the summary panel (detailLevel 0) for comfortable viewing.
 */
export function VRHUD() {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastText = useRef('');
  const panels = useDashboardStore((s) => s.panels);
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId);

  // Position below the currently focused panel, or summary panel if none focused
  const hudPosition = useMemo((): [number, number, number] => {
    if (panels.length === 0) {
      return [0, -1.5, -2];
    }

    // Find the focused panel, or fall back to summary panel (detailLevel 0)
    let targetPanelIndex = focusedPanelId
      ? panels.findIndex((p) => p.id === focusedPanelId)
      : panels.findIndex((p) => p.semantic.detailLevel === 0);

    if (targetPanelIndex === -1) {
      targetPanelIndex = 0; // Fallback to first panel
    }

    const targetPanel = panels[targetPanelIndex];
    const positions = grammarLayout(panels);
    const targetPos = positions[targetPanelIndex].position;

    // Match VR offsets from DashboardScene
    const VR_Y_OFFSET = 0.5;
    const VR_Z_OFFSET = -2;
    const SPACING_BELOW = 0.3; // Additional spacing below panel bottom edge

    // Panel position is its center, so bottom edge is at center - height/2
    // Account for panel height to position breadcrumb below the panel's bottom edge
    const panelHeight = targetPanel.size.height;
    const panelBottomY = targetPos[1] + VR_Y_OFFSET - panelHeight / 2;

    return [
      targetPos[0], // Same X as focused panel
      panelBottomY - SPACING_BELOW, // Below panel's bottom edge
      targetPos[2] + VR_Z_OFFSET, // Same Z depth as panels
    ];
  }, [panels, focusedPanelId]);

  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 64;
    return c;
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [canvas]);

  useFrame(() => {
    const { navigation } = useDashboardStore.getState();
    const breadcrumb =
      navigation.steps
        .slice(0, navigation.currentIndex + 1)
        .map((s) => s.label)
        .join(' > ') || 'Overview';
    const cacheSize = getTextureCache().size;
    const text = `${breadcrumb}  |  textures: ${cacheSize}`;

    if (text === lastText.current) return;
    lastText.current = text;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    // eslint-disable-next-line react-hooks/immutability
    texture.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} position={hudPosition}>
      <planeGeometry args={[2, 0.12]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
