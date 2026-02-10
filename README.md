# 3D Spatial Analytics Dashboard

A browser-based 3D dashboard where SaaS analytics panels are arranged in 3D space using a **Spatial Relationship Grammar** — a structured mapping of data semantics to physical position. Navigate a hierarchy of 30 panels across three axes with cinematic camera transitions, click-to-drill interactivity, and keyboard navigation.

**Live demo:** [accionlabs.github.io/3danalytics](https://accionlabs.github.io/3danalytics/)

## Spatial Relationship Grammar

The core innovation is a grammar that maps data relationships to spatial dimensions. Every panel has a **semantic address** `(processStep, segment, detailLevel)` that determines its 3D position:

```
X-axis → Pipeline Stage    (left-to-right causal flow)
Y-axis → Segment           (vertical comparison)
Z-axis → Detail Level      (depth — overview near camera, detail far)
```

This creates an intuitive spatial model: moving right follows the business pipeline, moving vertically compares customer segments, and moving into the screen drills into finer detail.

### The Three Axes

**X — Pipeline Stage (causal flow)**
Five stages of the SaaS pipeline arranged left-to-right: Marketing → Leads → Pipeline → Revenue → Retention. Horizontal neighbors share the same segment and depth but represent different stages of the customer journey.

**Y — Segment (comparison)**
Three customer segments stacked vertically: Startup, SMB, Enterprise. Vertical neighbors share the same pipeline stage and depth but represent different market segments for side-by-side comparison.

**Z — Detail Level (drill-down)**
Four depth layers from overview to granular detail:

| Depth | Layer | Panels | Description |
|-------|-------|--------|-------------|
| Z=0 | Dashboard | 1 | Single KPI overview of all 5 pipeline stages |
| Z=1 | Pipeline Summary | 5 | One panel per pipeline stage showing 3 segment bars |
| Z=2 | Segment Detail | 15 | Full chart per pipeline stage × segment (5 × 3) |
| Z=3 | Deep Detail | 9 | Granular breakdowns (lead source, pipeline stage, account revenue) |

### Hierarchy and Drill-Down

Panels form a tree via parent-child relationships that map to the Z-axis:

```
Z=0  SaaS Dashboard (5 KPI cards → click to drill)
      │
Z=1  Marketing ─── Leads ─── Pipeline ─── Revenue ─── Retention
      │              │          │            │            │
Z=2  Startup       Startup    Startup      Startup      Startup
     SMB           SMB        SMB          SMB          SMB
     Enterprise    Enterprise Enterprise   Enterprise   Enterprise
                    │          │            │
Z=3              Lead Source  Pipe Stage   Acct Revenue  (× 3 segments)
```

**Click-to-drill:** Parent panels visualize their children as clickable data dimensions. The Z=0 dashboard shows 5 KPI cards — clicking any card navigates to the corresponding Z=1 pipeline panel. Each Z=1 panel shows 3 segment bars (Startup / SMB / Enterprise) — clicking a bar navigates to the corresponding Z=2 segment detail panel.

### Causal Links and Connectors

61 causal links are rendered as 3D arrow connectors between panels:

- **Causal links** (blue, X-axis) — left-to-right pipeline flow within a depth layer
- **Hierarchy links** (amber, Z-axis) — parent-to-child drill-down relationships
- **Segment links** (green, Y-axis) — vertical comparison between segments at the same step

## Panels and Chart Types

30 panels across 4 depth layers, using 7 chart types:

| Chart Type | Library | Used At |
|-----------|---------|---------|
| KPI Cards | Custom HTML | Z=0 dashboard, Z=2 revenue detail |
| Bar Chart | Recharts | Z=1 summary (segment bars), Z=2 marketing, Z=3 lead source / accounts |
| Line Chart (MRR/ARR) | Recharts | Z=2 pipeline detail |
| Area Chart (Churn) | Recharts | Z=2 retention detail |
| Funnel Chart | Custom SVG | Z=2 leads detail, Z=3 pipeline stages |
| Cohort Heatmap | D3 custom SVG | (available in registry) |
| Geo Choropleth | D3 geo projection | (available in registry) |

## Navigation

### Mouse / Touch

| Action | Input |
|--------|-------|
| Focus a panel | Click on it |
| Drill into child | Click a bar or KPI card within the panel |
| Return to overview | Click empty space |
| Pan the camera | Left-click drag on empty space |
| Zoom in/out | Scroll wheel |

### Keyboard

| Key | Action | Axis |
|-----|--------|------|
| Arrow Left / Right | Previous / next pipeline stage | X (blue) |
| Arrow Up / Down | Previous / next segment | Y (green) |
| `.` or `>` | Drill deeper | Z (amber) |
| `,` or `<` | Drill out (back to parent) | Z |
| Backspace | Navigate back in history | — |
| Home | Return to overview | — |

### UI Elements

- **Breadcrumbs** — ancestry chain from root to current panel, clickable for quick navigation
- **Navigation Helper** — contextual bar showing available neighbors along each axis with color-coded direction arrows
- **Axis Indicators** — transient labels (fade after 3s) showing which axis is which when navigating

## Running Locally

Requires Node.js 20.19+ or 22+.

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

```
src/
  components/
    scene/          # 3D spatial shell (domain-agnostic)
      DashboardScene.tsx      # Top-level scene — childMap, click-to-drill wiring
      DashboardPanel.tsx      # Single panel (Html overlay in 3D space)
      CameraController.tsx    # Animated camera with zoom, pan, focus
      Environment.tsx         # Lights, stars, grid floor
      PostProcessing.tsx      # Bloom, depth of field, vignette
      Connectors.tsx          # 3D arrow connectors between linked panels
    charts/          # SaaS content pack (replaceable)
      RevenueChart, ChurnChart, CohortChart, FunnelChart,
      KpiCard, GeoChart, BarChart
    ui/              # DOM overlay
      Breadcrumbs.tsx         # Ancestry chain navigation
      NavigationHelper.tsx    # Contextual axis-neighbor buttons
      AxisIndicators.tsx      # Transient axis labels
  store/             # Zustand state (panels, navigation history, camera)
  layouts/           # grammarLayout — semantic address → 3D position
  registry/          # Chart component registry (string → React component)
  hooks/             # useKeyboardNavigation — axis-aware keyboard nav
  data/              # Mock SaaS data (30 panels, 61 causal links)
  types/             # SemanticAddress, CausalLink, PanelConfig, NavigationHistory
```

### Key Design Decisions

- **Spatial grammar over arbitrary layout** — panel positions are computed deterministically from semantic addresses, not manually placed. Adding a new panel only requires defining its `(processStep, segment, detailLevel)`.
- **Charts are 2D HTML in 3D space** via drei's `<Html transform>`. Full DOM interactivity (tooltips, hover, click) while correctly positioned in 3D.
- **Chart registry pattern** — `DashboardPanel` doesn't know what chart types exist. Components register in a `Map<string, Component>`. A new domain just registers its own charts.
- **Click-to-drill via childMap** — parent panels pass `onItemClick` to their chart; clicking an item navigates to the Nth child panel. The mapping is generic: Z=0→Z=1 sorts children by pipeline step, Z=1→Z=2 sorts by segment.
- **Navigation history** — Zustand store tracks a full step history with axis labels, supporting back/forward and breadcrumb navigation.
- **Spring physics** — panel positions and camera movements use `@react-spring/three` for smooth animation.

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

- **Phase 2** — Minimap navigation, touch/mobile support, render-to-texture panels, mock API layer
- **Phase 3** — WebXR (VR/AR) via `@react-three/xr`, controller interaction, VR-mode chart rendering

## License

Accion Labs Innovation R&D. Internal use.
