import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  useXRInputSourceState,
  useXRControllerButtonEvent,
} from '@react-three/xr';
import * as THREE from 'three';
import { useDashboardStore } from '../store/dashboardStore.ts';
import { vrLocomotion } from '../components/xr/XRTeleport.tsx';

/** Smooth locomotion speed in meters/second */
const MOVE_SPEED = 3.0;
/** Thumbstick dead zone for smooth movement */
const MOVE_DEAD_ZONE = 0.15;

/**
 * VR controller input — combines smooth locomotion with discrete panel navigation.
 *
 * Controller mapping:
 * - Left thumbstick: smooth locomotion (forward/back/strafe relative to head direction)
 * - Right thumbstick left/right: navigate X-axis panels (processStep ±1)
 * - Right thumbstick up/down: navigate Y-axis panels (segment ±1)
 * - Either squeeze: navigate back
 */
export function useVRNavigation() {
  const leftController = useXRInputSourceState('controller', 'left');
  const rightController = useXRInputSourceState('controller', 'right');
  const { camera } = useThree();

  // Temp vectors to avoid allocation
  const _forward = useRef(new THREE.Vector3());
  const _right = useRef(new THREE.Vector3());

  // Squeeze (grip) on either controller → navigate back
  useXRControllerButtonEvent(leftController, 'xr-standard-squeeze', (state) => {
    if (state === 'pressed') {
      useDashboardStore.getState().navigateBack();
      vrLocomotion.offset.set(0, 0, 0);
      vrLocomotion.yaw = 0;
    }
  });
  useXRControllerButtonEvent(
    rightController,
    'xr-standard-squeeze',
    (state) => {
      if (state === 'pressed') {
        useDashboardStore.getState().navigateBack();
        vrLocomotion.offset.set(0, 0, 0);
        vrLocomotion.yaw = 0;
      }
    },
  );

  useFrame((_state, delta) => {
    // ── Left thumbstick: smooth locomotion ──
    if (leftController) {
      const thumbstick = leftController.gamepad?.['xr-standard-thumbstick'];
      if (thumbstick) {
        const x = thumbstick.xAxis ?? 0;
        const y = thumbstick.yAxis ?? 0;

        if (Math.abs(x) > MOVE_DEAD_ZONE || Math.abs(y) > MOVE_DEAD_ZONE) {
          // Get camera's forward direction projected onto XZ plane
          camera.getWorldDirection(_forward.current);
          _forward.current.y = 0;
          _forward.current.normalize();

          // Right vector
          _right.current
            .crossVectors(_forward.current, new THREE.Vector3(0, 1, 0))
            .normalize();

          // Accumulate locomotion offset (world moves opposite)
          const moveX = x * MOVE_SPEED * delta;
          const moveZ = y * MOVE_SPEED * delta; // thumbstick Y: forward is negative
          vrLocomotion.offset.addScaledVector(_right.current, -moveX);
          vrLocomotion.offset.addScaledVector(_forward.current, moveZ);
        }
      }
    }

    // ── Right thumbstick: Vertical altitude control ──
    if (rightController) {
      const thumbstick = rightController.gamepad?.['xr-standard-thumbstick'];
      if (thumbstick) {
        const y = thumbstick.yAxis ?? 0;

        if (Math.abs(y) > MOVE_DEAD_ZONE) {
          // Push forward (−Y) = up (+Y in world), pull back (+Y) = down (−Y in world)
          // Since the world moves opposite to the user, we subtract from offset.y to move user up
          const moveY = y * MOVE_SPEED * delta;
          vrLocomotion.offset.y -= moveY;
        }
      }
    }
  });
}
