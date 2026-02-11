# Meta Quest VR Testing Guide

## What I Fixed

### Issue: "Connect to a device to get into VR mode" message on Quest

**Root Cause:**
- WebXR session was not being requested with proper checks
- No validation that immersive-vr mode is supported

**Fix Applied:**
- Added WebXR support detection before entering VR
- Added immersive-vr session support check
- Improved error messages with specific failure reasons
- Added proper timing for XR wrapper mounting

## Testing on Meta Quest

### Prerequisites

1. **Meta Quest Device** (Quest 2, Quest 3, or Quest Pro)
2. **Developer Mode** enabled (optional but recommended for debugging)
3. **App deployed** to accessible URL (localhost won't work on Quest)
4. **Quest Browser** (built-in browser - best WebXR support)

### Deployment Options

**Option 1: Deploy to Production/Staging**
```bash
npm run build
# Deploy dist/ to your hosting service (Vercel, Netlify, etc.)
```

**Option 2: Use ngrok for Local Testing**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Expose to internet
npx ngrok http 5173
# Copy the https URL ngrok provides
```

**Option 3: Use LocalTunnel**
```bash
npm run dev
npx localtunnel --port 5173
# Copy the URL provided
```

### Step-by-Step Testing

#### Step 1: Open App in Quest Browser

1. Put on your Meta Quest headset
2. Open the **Browser** app (not Firefox or others)
3. Navigate to your app URL
4. App should load in desktop mode

**Expected:**
- ✅ Dashboard panels visible
- ✅ "Enter VR" button in top-right navbar
- ✅ Can interact with panels using controller pointer

#### Step 2: Enter VR Mode

1. Point controller laser at "Enter VR" button
2. Click trigger to activate button

**What Should Happen:**
- Browser shows WebXR permission prompt
- Prompt says "Allow VR mode?" or similar
- Accept the prompt

**If you see "connect to a device" error:**
- Check browser console for specific error message
- Ensure you're using Quest Browser (not Firefox/Chrome)
- Make sure you accepted permissions
- Try refreshing the page and clicking again

#### Step 3: Verify VR Mode

Once in VR:
- ✅ Scene transitions to immersive 3D space
- ✅ Controllers visible as 3D objects
- ✅ Dashboard panels floating in 3D space
- ✅ Can look around by moving your head
- ✅ Background shows starfield and grid

#### Step 4: Test VR Navigation

**Controller Mapping:**

| Action | Controller Input |
|--------|-----------------|
| Navigate X-axis (process steps) | Left thumbstick left/right |
| Navigate Y-axis (segments) | Left thumbstick up/down |
| Navigate Z-axis (drill in/out) | Right thumbstick up/down |
| Focus panel | Point + trigger |
| Go back | Grip button |
| Go home | A or X button |

**Test Each:**
1. Move left thumbstick right → Should navigate to next panel on X-axis
2. Move left thumbstick up → Should navigate along Y-axis
3. Move right thumbstick up → Should drill into detail level
4. Point at a panel and pull trigger → Should focus that panel
5. Press grip button → Should go back to parent panel
6. Press A or X → Should return home

#### Step 5: Exit VR Mode

**Method 1: Use "Exit VR" button**
- Look at the navbar area
- The button should be visible (may need to adjust view)
- Point and click to exit

**Method 2: Use Quest Home button**
- Press the Meta button on right controller
- Return to Quest Home
- VR session will end automatically

**Method 3: Remove headset**
- Take off the headset
- Session ends automatically after a few seconds

After exiting:
- ✅ Browser returns to regular 2D view
- ✅ Button changes from "Exit VR" to "Enter VR"
- ✅ Can enter VR again by clicking button

## Troubleshooting

### Error: "Connect to a device to get into VR mode"

**Possible Causes:**

1. **Not using Quest Browser**
   - Solution: Close app, open in native Quest Browser

2. **Permissions denied**
   - Solution: Refresh page, click "Enter VR" again, accept permissions

3. **WebXR not detected**
   - Open browser console (Quest Developer Mode required)
   - Check if `navigator.xr` exists
   - If undefined, browser doesn't support WebXR

4. **Session already active**
   - Solution: Refresh the page completely
   - Try clearing browser cache

### Error: "Immersive VR mode is not supported"

This means WebXR is present but immersive-vr session mode is not available.

**Solutions:**
- Update Quest firmware to latest version
- Update Quest Browser to latest version
- Try restarting the Quest device
- Some older Quest models may not support immersive-vr

### Black Screen in VR

Scene loads but you see only black:

**Solutions:**
1. Click "Exit VR" then try entering again
2. Refresh the page and re-enter VR
3. Check browser console for Three.js errors
4. Camera might be inside a panel - wait a moment for animation

### Panels Not Visible in VR

You're in VR but panels don't appear:

**Possible Causes:**
- Render-to-texture not working
- Panels are outside camera view
- Scene not loaded before entering VR

**Solutions:**
1. Exit VR, verify panels visible in desktop mode
2. Refresh page, wait for panels to load, then enter VR
3. Check console for `DashboardPanelVR` errors
4. Look around in all directions - panels might be behind you

### Controllers Not Responding

VR mode works but controllers don't navigate:

**Check:**
1. Are controllers turned on and paired?
2. Try pressing different buttons to see if any work
3. Check console for gamepad detection messages
4. Some buttons may be reserved by Quest OS

**Debug in Console:**
```javascript
// Check if gamepads detected
navigator.getGamepads()
```

### Performance Issues / Lag

Scene stutters or drops frames in VR:

**Solutions:**
1. Reduce number of visible panels (limit to 8-10)
2. Lower texture resolution in DashboardPanelVR (reduce PX_PER_UNIT)
3. Increase texture update interval (change from 1000ms to 2000ms)
4. Disable comfort vignette if not needed
5. Close other Quest apps running in background

## Developer Console Access

To see console logs on Quest (requires Developer Mode):

1. Enable Developer Mode in Quest settings
2. Connect Quest to PC via USB-C
3. Open Chrome on PC
4. Navigate to `chrome://inspect`
5. Find your Quest device
6. Click "inspect" on the browser tab

This shows the same console as desktop browser.

## Console Commands for Debugging

Once you have console access:

```javascript
// Check WebXR support
console.log('XR supported:', !!navigator.xr)

// Check immersive-vr support
navigator.xr?.isSessionSupported('immersive-vr').then(console.log)

// Check current VR state
console.log('VR Mode:', window.__xrStore?.getState())

// Force enter VR (for debugging)
window.__requestVR()
await new Promise(r => setTimeout(r, 200))
window.__xrStore?.enterVR()

// Force exit VR
window.__xrStore?.getState().session?.end()
```

## Expected Console Output

**On successful VR entry:**
```
[VR] Requesting immersive-vr session...
[VR] Session state changed: ACTIVE
```

**On successful VR exit:**
```
[VR] Session state changed: INACTIVE
```

**On error:**
```
Failed to toggle VR mode: [specific error message]
```

## Common WebXR Errors and Solutions

| Error | Meaning | Solution |
|-------|---------|----------|
| `NotSupportedError` | Browser doesn't support WebXR | Use Quest Browser |
| `SecurityError` | Page not HTTPS | Deploy with HTTPS (http://localhost is OK for dev) |
| `InvalidStateError` | Session already active | Refresh page |
| `NotAllowedError` | User denied permission | Re-click button, accept prompt |

## Best Practices

1. **Always test on actual Quest hardware** - emulators don't catch all issues
2. **Use HTTPS in production** - required for WebXR on deployed apps
3. **Handle permissions gracefully** - show helpful messages if denied
4. **Test on multiple Quest models** - Quest 2 vs Quest 3 may behave differently
5. **Monitor performance** - VR requires 72+ FPS, check with Quest performance overlay

## Production Checklist

Before deploying VR-enabled app:

- [ ] Tested on actual Quest device (not just emulator)
- [ ] App served over HTTPS
- [ ] "Enter VR" button clearly visible and accessible
- [ ] Permissions prompt appears and works
- [ ] Scene loads completely before entering VR
- [ ] All panels visible in VR space
- [ ] Controller inputs work for navigation
- [ ] Exit VR returns to desktop mode correctly
- [ ] Can re-enter VR without refreshing
- [ ] Performance is smooth (no stuttering or lag)
- [ ] Error messages are clear and helpful

## Reference: Working Example

Compare your implementation with the reference app:
https://chirag-banjan.github.io/VR-screens/

**What to check:**
- How they trigger VR entry
- Permission flow
- Transition to VR mode
- Controller interaction

## Support

If issues persist after trying all troubleshooting steps:

1. Note the specific error message from console
2. Record a video of the issue if possible
3. Check Quest firmware version (Settings → System → Software Update)
4. Try a different Quest device if available
5. Test in Quest Developer Hub with runtime logs

Remember: VR on Quest works best with the native Quest Browser. Third-party browsers may have limited or no WebXR support.
