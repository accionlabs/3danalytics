# 3D Spatial Analytics Dashboard

A browser-based 3D dashboard where SaaS analytics panels float in 3D space, built with React Three Fiber. Navigate between panels with cinematic camera transitions, switch between spatial layouts, and explore data in an immersive environment.

**Live demo:** [accionlabs.github.io/3danalytics](https://accionlabs.github.io/3danalytics/)

## What It Does

Seven analytics panels — each rendering a different chart type — are arranged in 3D space. You can fly between them, zoom in on any panel, pan around the scene, and switch between three spatial layout modes.

### Panels

| Panel | Chart Type | Library |
|-------|-----------|---------|
| Revenue Overview | Line chart (MRR/ARR) | Recharts |
| Churn Rate | Area chart with reference line | Recharts |
| Cohort Retention | Heatmap grid | D3 (custom SVG) |
| Acquisition Funnel | Horizontal bar chart | Custom SVG |
| Key Metrics | KPI cards with trend indicators | Custom HTML |
| Revenue by Region | World map choropleth | D3 geo projection |
| Revenue by Product | Vertical bar chart | Recharts |

### Layouts

- **Arc** — panels arranged on a 180-degree semicircle
- **Grid** — panels on a curved cylindrical surface in rows and columns
- **Room** — panels distributed across three walls of a virtual room

Switch layouts using the nav bar at the top of the screen. Panels animate smoothly to their new positions.

## Controls

| Action | Input |
|--------|-------|
| Focus a panel | Click on it |
| Return to overview | Click the same panel again, or click empty space |
| Pan the camera | Left-click drag on empty space |
| Zoom in/out | Scroll wheel |
| Switch layout | Click Arc / Grid / Room in the top nav bar |

Camera transitions are animated with spring physics — the camera smoothly flies to the clicked panel and back to overview. Zoom and pan positions are preserved when navigating between panels.

## Running Locally

Requires Node.js 22+.

```bash
git clone https://github.com/accionlabs/3danalytics.git
cd 3danalytics
npm install
npm run dev
```

Open http://localhost:5173 in a browser.

### Other Commands

```bash
npm run build      # Type-check and build for production
npm run preview    # Preview the production build locally
npm run test       # Run unit tests
npm run test:watch # Run tests in watch mode
npm run lint       # Lint with ESLint
```

## Architecture

The project separates the reusable 3D spatial shell from the domain-specific analytics content:

```
src/
  components/
    scene/          # Reusable 3D shell (domain-agnostic)
      DashboardScene.tsx      # Top-level scene, renders all panels
      DashboardPanel.tsx      # Single 3D panel (Html overlay in 3D space)
      CameraController.tsx    # Animated camera with zoom, pan, focus
      Environment.tsx         # Lights, stars, grid floor
      PostProcessing.tsx      # Bloom, depth of field, vignette
    charts/          # SaaS content pack (replaceable)
      RevenueChart.tsx, ChurnChart.tsx, CohortChart.tsx,
      FunnelChart.tsx, KpiCard.tsx, GeoChart.tsx, BarChart.tsx
    ui/              # DOM overlay (nav bar, breadcrumbs)
  store/             # Zustand state (panels, layout, focus, camera)
  layouts/           # Layout algorithms (arc, grid, room)
  registry/          # Chart component registry (string -> React component)
  data/              # Mock SaaS metrics data
  types/             # TypeScript interfaces
```

### Key Design Decisions

- **Charts are 2D HTML rendered inside 3D space** via drei's `<Html transform>` component. This gives full DOM interactivity (tooltips, hover states) while positioning panels correctly in 3D.
- **Chart registry pattern** — `DashboardPanel` doesn't know what chart types exist. Chart components register themselves in a `Map<string, Component>`. A new analytics domain just registers its own charts.
- **Camera-based navigation** — focus is purely a camera pan/zoom. No rendering mode changes, no dimming of other panels. All panels are always visible and interactive.
- **Spring physics** — panel positions and camera movements use `@react-spring/three` for smooth, physically-based animation.
- **Depth-sorted z-index** — drei maps each panel's camera distance to a CSS z-index (`[10000, 0]` range) so closer panels correctly overlap farther ones.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| 3D Rendering | React Three Fiber |
| 3D Helpers | @react-three/drei |
| Animation | @react-spring/three |
| Post-Processing | @react-three/postprocessing |
| Charts | Recharts + D3.js |
| State | Zustand |
| Styling | Tailwind CSS 4 |
| Testing | Vitest |

## Roadmap

- **Phase 2** — Minimap navigation, touch/mobile support, drill-down sub-panels, mock API layer
- **Phase 3** — WebXR (VR/AR) via `@react-three/xr`, controller interaction, render-to-texture panels for VR mode

## License

Accion Labs Innovation R&D. Internal use.
