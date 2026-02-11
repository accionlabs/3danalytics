# VR Testing Guide

## Issues Fixed

### 1. VR Mode Enabled by Default ✅
**What was wrong:** The app was starting in VR mode instead of desktop mode.

**Root causes:**
- XR store subscription was triggering state updates on mount
- Camera initial position was [0,0,0] causing blank screens
- Vignette component had rendering errors

**Fixes applied:**
- Added safety check to force-exit any existing XR session on app mount
- Improved session state tracking to only update when state actually changes
- Fixed camera initial position to [0,0,6] for proper overview
- Fixed vignette rendering with proper conditional rendering
- Added console logging for debugging session state changes

### 2. Black Screen in VR ✅
**What was wrong:** Scene not rendering in VR mode.

**Fixes:**
- Fixed initial camera position
- Added `key="scene"` to DashboardScene to prevent remounting
- Ensured XR wrapper always wraps scene (no conditional mounting)

### 3. React Three Fiber Error ✅
**Error:** "Div is not part of the THREE namespace"

**Fix:** Wrapped vignette mesh in `<group>` with conditional rendering

---

## Testing Checklist

### Desktop Testing (No VR Device)

**Step 1: Verify Desktop Mode is Default**
```bash
npm run dev
```

Expected behavior:
- ✅ App loads showing "Enter VR" button (NOT "Exit VR")
- ✅ All dashboard panels visible and interactive
- ✅ Mouse drag panning works
- ✅ Trackpad scroll navigation works
- ✅ Keyboard navigation works (arrow keys, Home, etc.)

**Step 2: Test VR Button Without VR Device**

Click "Enter VR" button.

Expected behavior:
- ✅ Alert appears: "Failed to enter VR mode. Make sure you are on a VR-capable device or using the WebXR emulator."
- ✅ Button remains "Enter VR" (does not change to "Exit VR")
- ✅ Desktop mode continues to work normally

**Check browser console:**
- Should NOT see "[VR] Session state changed: ACTIVE" on page load
- Should only see VR logs when you click the button

---

### WebXR Emulator Testing (Desktop)

**Prerequisites:**
1. Install [WebXR API Emulator](https://chrome.google.com/webstore/detail/webxr-api-emulator) Chrome extension
2. Open Chrome DevTools (F12)
3. Navigate to "WebXR" tab
4. Select a device (e.g., "Oculus Quest")

**Step 1: Initial Load**
```bash
npm run dev
```

Expected:
- ✅ App loads in desktop mode ("Enter VR" button visible)
- ✅ Console shows: `[VR] Session state changed: INACTIVE` or no VR logs

**Step 2: Enter VR**

Click "Enter VR" button.

Expected:
- ✅ Browser shows WebXR permission prompt
- ✅ After accepting, button changes to "Exit VR"
- ✅ Console shows: `[VR] Session state changed: ACTIVE`
- ✅ Scene remains visible in emulator view
- ✅ WebXR tab shows controller overlays

**Step 3: Test in VR**

With emulator active:
- ✅ Move emulated controllers using WebXR tab controls
- ✅ Verify scene is visible (not black screen)
- ✅ Check that panels render (may be textured, not HTML overlays)

**Step 4: Exit VR**

Click "Exit VR" button.

Expected:
- ✅ Button changes back to "Enter VR"
- ✅ Console shows: `[VR] Session state changed: INACTIVE`
- ✅ Scene returns to desktop mode
- ✅ Panels render as HTML overlays again (interactive)

---

### Meta Quest Testing

**Prerequisites:**
- Meta Quest 2, 3, or Pro with Developer Mode enabled
- App deployed and accessible via URL
- Quest Browser (built-in)

**Step 1: Open App in Quest Browser**

Navigate to your deployed app URL.

Expected:
- ✅ App loads in desktop mode
- ✅ "Enter VR" button visible at top right
- ✅ All panels visible and interactive

**Step 2: Enter VR Mode**

Click "Enter VR" button using controller pointer or hand tracking.

Expected:
- ✅ Browser prompts for VR permission
- ✅ After accepting, app enters immersive VR mode
- ✅ Scene transitions to full 3D immersive view
- ✅ Controllers visible in space
- ✅ All dashboard panels visible in 3D space

**Step 3: Test VR Navigation**

Use controllers:
- ✅ **Left thumbstick X**: Navigate along X-axis (process steps)
- ✅ **Left thumbstick Y**: Navigate along Y-axis (segments)
- ✅ **Right thumbstick Y**: Navigate along Z-axis (drill in/out)
- ✅ **Trigger button**: Focus/drill into panel (point at panel first)
- ✅ **Grip button**: Navigate back to parent
- ✅ **A or X button**: Navigate home

**Step 4: Test VR Comfort Features**

During navigation:
- ✅ Vignette effect appears during camera transitions (edges darken)
- ✅ Smooth camera animations (not instant teleport by default)
- ✅ No nausea or discomfort during movement

**Step 5: Exit VR**

Remove headset or use Quest home button, then click "Exit VR".

Expected:
- ✅ Returns to desktop browser mode
- ✅ Button changes to "Enter VR"
- ✅ Can re-enter VR by clicking button again

---

## Troubleshooting

### Issue: "Exit VR" Shows on Initial Load

**Diagnosis:**
- VR mode is being enabled by default
- Check browser console for `[VR] Session state changed: ACTIVE` on page load

**Solution:**
1. Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check console for warning: `[VR] WARNING: XR session exists on mount`
4. If warning appears, there's a session persistence issue - restart browser

### Issue: Black Screen in VR

**Diagnosis:**
- Scene not rendering in VR mode

**Solutions:**
1. Click "Exit VR" then "Enter VR" again
2. Check console for errors (especially THREE.js errors)
3. Verify panels are being created (check React DevTools)
4. Try refreshing page before entering VR

### Issue: Blank/White Panels

**Diagnosis:**
- Render-to-texture not working correctly
- VR mode state out of sync

**Solutions:**
1. Exit VR and verify panels appear in desktop mode
2. Check console for `DashboardPanelVR` errors
3. Verify you're actually in a VR session (check console for `[VR] Session state changed: ACTIVE`)
4. If panels are blank in desktop mode, VR state is wrong - refresh page

### Issue: VR Button Does Nothing

**Diagnosis:**
- XR store not initialized
- WebXR not available

**Solutions:**
1. Check console for errors after clicking button
2. On desktop: Install WebXR emulator and configure in DevTools
3. On Quest: Ensure using Quest Browser (not Firefox or other browsers)
4. Verify WebXR is supported: Open console and type `navigator.xr` - should not be undefined

### Issue: Controllers Not Responding

**Diagnosis:**
- Gamepad API not working
- Button mapping incorrect

**Solutions:**
1. Check console for gamepad connection logs
2. Try different buttons to see if any work
3. Verify controllers are turned on and paired
4. Some buttons may be reserved by browser - try different ones

---

## Verification Commands

Run these in browser console to debug:

```javascript
// Check VR mode state
console.log('VR Mode:', useDashboardStore.getState().isVRMode)

// Check XR store state
console.log('XR Session:', window.__xrStore?.getState().session)

// Force enter VR (for debugging)
window.__xrStore?.enterVR()

// Force exit VR (for debugging)
window.__xrStore?.getState().session?.end()
```

---

## Success Criteria

Your VR implementation is working correctly if:

1. ✅ App starts in desktop mode every time
2. ✅ "Enter VR" button shows initially
3. ✅ Clicking button without VR device shows appropriate error
4. ✅ With WebXR emulator, entering VR works smoothly
5. ✅ Scene renders correctly in VR (not black screen)
6. ✅ Can exit and re-enter VR multiple times
7. ✅ On Meta Quest, immersive VR mode activates correctly
8. ✅ Controllers work for navigation
9. ✅ Dashboard panels visible in VR
10. ✅ No console errors (except expected "no VR device" alert)

---

## Known Limitations

1. **Chart Interactivity in VR**: Charts in VR are rendered as textures and are not fully interactive (no tooltips or hover effects). This is a WebXR limitation - HTML overlays don't work in immersive mode.

2. **Texture Update Rate**: Charts update every 1000ms (1 second) in VR mode. Real-time chart animations may appear delayed.

3. **Browser Support**:
   - Desktop: Chrome with WebXR emulator
   - Mobile: Chrome on Android
   - VR: Quest Browser, Steam VR Browser
   - Safari and Firefox have limited WebXR support

4. **Performance**: VR mode requires higher frame rates (72-90 FPS). On complex dashboards with many panels, performance may degrade.

---

## Next Steps

If all tests pass:
- ✅ VR implementation is complete and working
- Deploy to production
- Test on actual Quest devices
- Gather user feedback on VR experience

If tests fail:
- Check console logs for specific errors
- Review the fixes applied above
- Ensure all changes are deployed
- Try testing in incognito/private mode (clean state)
