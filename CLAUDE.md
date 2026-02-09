# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D Spatial UI for Data Analytics Dashboards — an Accion Labs Innovation R&D project. The goal is a browser-based 3D dashboard where multiple analytics panels float in 3D space, with animated camera transitions for drill-downs, and progressive enhancement toward WebXR (VR/AR).

**Status:** Pre-implementation (requirements and research phase). The specification lives in `requirements/3D UI and Data Analytics.md`.

## Decided Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 18+ with TypeScript |
| Build Tool | Vite |
| 3D Rendering | React Three Fiber (`@react-three/fiber`) |
| 3D Helpers | `@react-three/drei` (Html overlay, CameraControls, Environment, Text) |
| Animation | `@react-spring/three` |
| Post-Processing | `@react-three/postprocessing` (bloom, depth of field, vignette) |
| Charts | Recharts + D3.js (rendered as HTML overlays via drei `<Html>`) |
| XR (Phase 3) | `@react-three/xr` |
| Styling | Tailwind CSS |
| State Management | Zustand |

## Architecture

The application follows a layered architecture:

```
App.tsx
├── Canvas (React Three Fiber)
│   └── DashboardScene
│       ├── DashboardPanel × N — floating panels in 3D space
│       │   └── drei <Html> — Recharts/D3 charts as interactive DOM overlays
│       ├── CameraController — animated camera paths via react-spring
│       └── Environment — lighting, particles, post-processing
└── UI Overlay (regular DOM)
    ├── Navigation / Breadcrumbs
    └── Minimap
```

**Key architectural decisions:**
- 2D charts placed as panels within 3D space (not 3D charts) — per research consensus on readability
- Charts start as HTML overlays (`<Html>` from drei); render-to-texture used selectively in Phase 2+ for better 3D integration
- Camera animation is the primary interaction paradigm — clicking a panel flies the camera to it while spawning detail sub-panels
- Progressive enhancement: desktop mouse → touch/mobile → VR controllers (same codebase)
- Limit visible panels to 8–12 for performance; use LOD and lazy-loading for off-screen panels

## Phased Delivery

**Phase 1 — Core 3D Dashboard:** Scene setup, panel layout (arc/grid/room arrangement), chart integration via Html overlays, camera animations with react-spring, post-processing effects (bloom, depth of field).

**Phase 2 — Interaction & UX:** Minimap navigation, touch/mobile support, render-to-texture for select panels, mock API data integration.

**Phase 3 — WebXR:** `@react-three/xr` integration, controller interaction mapping, VR-mode chart rendering (render-to-texture required — `<Html>` doesn't work in VR), testing on Meta Quest / Apple Vision Pro.

## Known Constraints

- drei's `<Html>` overlay floats above the WebGL canvas (not truly embedded in 3D) — use `occlude="blending"` to mitigate visual seams at extreme camera angles
- WebXR browser support is uneven: Chrome has best support, Safari/iOS is limited
- DOM events don't work in VR mode — must use raycasting + render-to-texture for chart interactivity in Phase 3
- Camera animations in VR can cause motion sickness — implement comfort-mode options (snap transitions, vignette during movement)
