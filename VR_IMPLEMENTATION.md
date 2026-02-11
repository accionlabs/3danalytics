# VR/WebXR Implementation Guide

## Overview

Phase 3 WebXR implementation has been completed. The application now supports VR mode as an optional enhancement to the existing desktop experience.

## Key Features

### 1. **VR Mode Toggle**
- A button in the top-right navbar allows users to enter/exit VR mode
- Desktop mode remains unchanged and fully functional
- VR mode is completely opt-in

### 2. **VR Controller Input Mapping**

The application maps VR controller inputs to navigation actions:

| Controller Input | Action |
|-----------------|--------|
| Left thumbstick X-axis | Navigate along X-axis (process steps) |
| Left thumbstick Y-axis | Navigate along Y-axis (segments) |
| Right thumbstick Y-axis | Navigate along Z-axis (drill in/out) |
| Trigger (squeeze) | Focus/drill into panel |
| Grip button | Navigate back to parent |
| A/X button | Navigate home |

### 3. **Render-to-Texture for Charts**

- In desktop mode: Charts render as HTML overlays using `drei <Html>` (interactive, sharp)
- In VR mode: Charts render to canvas textures (compatible with WebXR)
- Automatic switching based on VR mode state

### 4. **VR Comfort Mode**

Three comfort options to reduce motion sickness:

- **Vignette Effect** (default: ON): Darkens peripheral vision during camera transitions
- **Snap Transitions** (default: OFF): Instant teleportation instead of smooth movement
- **Reduced Speed** (default: OFF): Slower camera animations

Configure via `useDashboardStore`:
```typescript
const setVRComfortSettings = useDashboardStore(s => s.setVRComfortSettings)

setVRComfortSettings({
  useSnapTransitions: true,  // Enable teleportation
  useVignette: true,         // Enable comfort vignette
  reducedSpeed: false        // Normal speed
})
```

## Architecture Changes

### New Files Created

1. **`src/components/scene/VRControllerInput.tsx`**
   - Handles VR controller input polling
   - Maps controller axes and buttons to navigation actions

2. **`src/components/scene/DashboardPanelVR.tsx`**
   - Render-to-texture panel implementation
   - Renders React charts to off-screen canvas, applies as 3D texture

3. **`src/components/scene/VRComfortVignette.tsx`**
   - Shader-based vignette effect during camera transitions
   - Reduces motion sickness in VR

### Modified Files

1. **`src/App.tsx`**
   - Added XR store creation and session management
   - Conditionally wraps scene with `<XR>` when VR mode is active

2. **`src/components/ui/Navbar.tsx`**
   - Added "Enter VR" / "Exit VR" toggle button

3. **`src/store/dashboardStore.ts`**
   - Added `isVRMode` state
   - Added `vrComfortSettings` configuration

4. **`src/types/index.ts`**
   - Added `VRComfortSettings` interface

5. **`src/components/scene/DashboardScene.tsx`**
   - Conditionally renders VR-specific components
   - Switches between `DashboardPanel` and `DashboardPanelVR`

6. **`src/components/scene/CameraController.tsx`**
   - Added VR comfort mode support (snap transitions, reduced speed)

## Testing Instructions

### Desktop Testing (No VR Hardware Required)

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Verify desktop mode is default:**
   - App should load in desktop mode (button shows "Enter VR")
   - All panels should be visible and interactive
   - Mouse drag panning, trackpad scroll, keyboard navigation should work

3. **Test VR mode toggle:**
   - Click "Enter VR" button in navbar
   - If no VR device is available, you'll see an error alert
   - Desktop mode should remain functional

4. **Test with WebXR Emulator (Required for desktop VR testing):**
   - Install [WebXR API Emulator](https://chrome.google.com/webstore/detail/webxr-api-emulator)
   - Open DevTools → WebXR tab
   - Select a VR device (e.g., "Oculus Quest")
   - Now click "Enter VR" - it should work
   - The button changes to "Exit VR"
   - Scene should remain visible in VR mode

### WebXR Browser Testing

VR mode requires a WebXR-compatible browser. Support varies:

| Browser | Desktop | Mobile | VR Headset |
|---------|---------|--------|------------|
| Chrome | Emulator only | Android only | Full support |
| Edge | Emulator only | No | Full support |
| Firefox | No | No | Partial |
| Safari | No | No | Limited |

**Chrome WebXR Emulator:**
1. Install [WebXR API Emulator](https://chrome.google.com/webstore/detail/webxr-api-emulator) extension
2. Open DevTools → WebXR tab
3. Select a VR device (e.g., "Oculus Quest")
4. Click "Enter VR" in the app

### VR Headset Testing

**Meta Quest / Quest 2 / Quest 3:**
1. Enable Developer Mode on Quest
2. Open the built app URL in Quest Browser
3. Click "Enter VR" button
4. Grant VR permissions when prompted
5. Test controller inputs:
   - Thumbstick navigation along X, Y, Z axes
   - Trigger to focus panels
   - Grip to go back
   - A/X to go home

**Apple Vision Pro:**
1. Build and deploy to visionOS (requires Safari WebXR support)
2. VR mode should work with hand tracking and controllers

## Known Limitations

1. **`<Html>` overlays don't work in VR**
   - Solved via render-to-texture in `DashboardPanelVR.tsx`
   - Charts in VR are static textures (not interactive)

2. **Chart interactivity in VR**
   - Chart `onItemClick` callbacks work via raycasting on the texture plane
   - Hover effects and tooltips are not available in VR mode

3. **Render-to-texture performance**
   - Texture updates occur every 1 second (configurable)
   - May impact performance with many panels
   - Consider LOD (level of detail) for distant panels

4. **WebXR browser support**
   - Desktop browsers require emulator for testing
   - Production VR requires Android Chrome or native VR browser

5. **Camera movement comfort**
   - Default smooth lerp may cause motion sickness for some users
   - Enable snap transitions or reduced speed via comfort settings

## Future Enhancements

1. **Interactive VR charts**
   - Implement pointer raycasting to texture UV coordinates
   - Map UV clicks back to chart elements

2. **Hand tracking support**
   - Add gesture recognition for Apple Vision Pro
   - Pinch to select, swipe to navigate

3. **Multiplayer/collaborative VR**
   - Show other users as avatars in the 3D space
   - Shared cursor/pointer for collaboration

4. **VR-specific UI**
   - Floating menus in 3D space
   - Wrist-mounted dashboard controls

5. **Level-of-detail (LOD)**
   - Reduce texture resolution for distant panels
   - Lazy-load chart rendering

6. **Passthrough mode**
   - Mixed reality on Quest 3 / Vision Pro
   - Anchor panels to real-world surfaces

## Troubleshooting

**VR mode enabled by default on app launch:**
- FIXED: The app now correctly starts in desktop mode
- VR mode only activates when you explicitly click "Enter VR" and a VR session starts
- If you still see "Exit VR" on load, clear your browser cache

**Blank/white panels when "Exit VR" shows but not in VR:**
- FIXED: VR mode state now only activates when an actual VR session exists
- The app uses HTML overlays in desktop mode and render-to-texture only in actual VR
- If panels appear blank, refresh the page

**Black screen in VR headset:**
- Ensure you're using a WebXR-supported browser (Quest Browser, Chrome on Android)
- FIXED: Initial camera position adjusted from [0,0,0] to [0,0,6]
- Try clicking "Exit VR" then "Enter VR" again to re-initialize

**VR mode button doesn't work (shows error):**
- This is EXPECTED behavior without VR hardware or emulator
- Install WebXR API Emulator extension for desktop testing
- On Meta Quest, use the built-in browser (WebXR native support)

**Charts appear blank in VR:**
- Check `DashboardPanelVR.tsx` console logs
- Verify chart components render correctly in desktop mode first
- May need to adjust texture update interval (currently 1000ms)

**Motion sickness in VR:**
- Enable snap transitions: `setVRComfortSettings({ useSnapTransitions: true })`
- Enable vignette (should be on by default)
- Reduce animation speed: `setVRComfortSettings({ reducedSpeed: true })`

**Controllers not responding:**
- Verify controller batteries
- Check browser console for gamepad connection logs
- Some browsers require user gesture to access gamepad API

**"Enter VR" button appears but clicking does nothing:**
- Make sure you have WebXR emulator installed and configured in DevTools
- On physical VR devices, ensure WebXR permissions are granted
- Check browser console for specific error messages

## Code Examples

### Entering VR programmatically:
```typescript
import { useDashboardStore } from './store/dashboardStore'

const setVRMode = useDashboardStore(s => s.setVRMode)
setVRMode(true) // Enter VR
```

### Configuring VR comfort settings:
```typescript
import { useDashboardStore } from './store/dashboardStore'

const setVRComfortSettings = useDashboardStore(s => s.setVRComfortSettings)

setVRComfortSettings({
  useSnapTransitions: true,  // Teleport mode for sensitive users
  useVignette: true,         // Keep vignette on
  reducedSpeed: false        // Normal speed
})
```

### Checking VR mode state:
```typescript
import { useDashboardStore } from './store/dashboardStore'

function MyComponent() {
  const isVRMode = useDashboardStore(s => s.isVRMode)

  return (
    <div>
      {isVRMode ? 'In VR' : 'Desktop mode'}
    </div>
  )
}
```

## Performance Considerations

1. **Render-to-texture overhead:**
   - Each panel creates an off-screen canvas
   - Textures update every 1000ms
   - Consider reducing update frequency or using LOD

2. **VR frame rate target:**
   - VR requires 72 FPS minimum (Quest 2)
   - 90 FPS recommended (Quest 3, PC VR)
   - Monitor frame times in DevTools

3. **Optimization tips:**
   - Limit visible panels to 8-12
   - Use texture compression for large charts
   - Implement frustum culling for off-screen panels

## References

- [@react-three/xr documentation](https://github.com/pmndrs/xr)
- [WebXR Device API](https://www.w3.org/TR/webxr/)
- [Three.js VR examples](https://threejs.org/examples/?q=vr)
- [Meta Quest Browser WebXR](https://developer.oculus.com/documentation/web/browser-xr/)
