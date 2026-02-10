# 3D Spatial Analytics Dashboard

A browser-based 3D dashboard where SaaS analytics panels are arranged in 3D space using a **Spatial Relationship Grammar** — a structured mapping of data semantics to physical position. Navigate a hierarchy of 30 panels across three axes with cinematic camera transitions, click-to-drill interactivity, and keyboard navigation.

**Live demo:** [accionlabs.github.io/3danalytics](https://accionlabs.github.io/3danalytics/)

**Accion Labs Innovation R&D** — exploring how spatial interfaces can enhance data analytics dashboards.

## Why 3D Dashboards?

Traditional BI dashboards are constrained by 2D screen real estate. Users tab between views, lose context during drill-downs, and can only compare a limited number of visualizations simultaneously. Research from the Immersive Analytics community identifies several advantages of spatializing data views:

| Challenge in 2D Dashboards | How 3D Spatial UI Addresses It |
|---|---|
| Limited simultaneous views | Multiple panels arranged in 3D space using relationship-driven layouts |
| Context loss during drill-down | Camera flies to detail view while overview remains visible in peripheral space |
| Flat comparison of correlated data | Depth axis encodes an additional data dimension |
| Cognitive overload from tabs/pages | Spatial memory helps users recall "where" information lives |
| Presentation lacks engagement | Cinematic camera movements create narrative flow through data |

The concept of "space to think" (Andrews et al., 2010) demonstrates that spatially organizing analytical materials enhances information synthesis and recall. Immersive environments leverage spatial memory — a capability humans evolved for navigating physical spaces but that traditional 2D interfaces fail to exploit.

The research field has matured significantly since 2020, with major players like Tableau, Microsoft, and Flow Immersive investing in spatial data visualization. The open-source ecosystem around React Three Fiber and WebXR has reached a level of maturity that makes browser-to-XR progressive enhancement genuinely feasible.

## Spatial Relationship Grammar

### Why Layout Must Be Relationship-Driven

Traditional 3D dashboard prototypes arrange panels using arbitrary geometric templates. While visually impressive, these layouts are **semantically empty**: the spatial position of a panel tells the user nothing about its relationship to neighboring panels. A revenue chart placed to the left of a churn chart carries no more meaning than if their positions were swapped.

The defining advantage of 3D space over 2D is that it offers **three independent axes**, each capable of encoding a distinct dimension of meaning. If we assign those axes to the types of relationships that actually exist between analytics views, the layout itself becomes informative — the position of a panel _is_ the relationship.

### Taxonomy of Analytical Relationships

When a data analyst works with multiple views, those views are connected by a finite set of semantic relationships:

| # | Relationship Type | Definition | Example |
|---|---|---|---|
| 1 | **Hierarchical** (drill-down) | Summary decomposes into detail | Total Revenue → Revenue by Region → Revenue by Product |
| 2 | **Causal** (flow) | One metric drives another | Ad Spend → Leads → Pipeline → Closed Deals |
| 3 | **Comparative** (peers) | Same metric across parallel segments | Team A vs Team B, Enterprise vs SMB |
| 4 | **Complementary** (facets) | Different perspectives on same entity | Customer: Demographics + Purchases + Support |
| 5 | **Temporal** (time-ordered) | Same view at different time snapshots | Monthly snapshots, quarterly reviews |
| 6 | **Filtered** (lens) | Same visualization with different filters | Enterprise vs SMB vs Startup segments |
| 7 | **Anomaly** (spotlight) | Flagged issue with diagnostic views | Revenue spike → campaign data, seasonality |
| 8 | **Aggregation** (part-to-whole) | Individual views composing a whole | Regional dashboards → Global composite |

Not all eight need a dedicated spatial axis — 3D space only provides three. The key design decision is identifying which relationships are **orthogonal** (truly independent and frequently co-occurring) versus which can share an axis or use secondary visual channels.

### Orthogonal Decomposition: Three Primary Axes

Analysis reveals three fundamental, independent analytical dimensions that map naturally to the three spatial axes:

```
                    Y-axis (vertical)
                    │  CATEGORY / SEGMENTATION
                    │  "Which segment am I looking at?"
                    │
                    │        ┌─────────┐
                    │        │ Region  │
                    │        │  North  │
                    │        └─────────┘
                    │        ┌─────────┐
                    │        │ Region  │
                    │        │  South  │
                    │        └─────────┘
                    │
                    └──────────────────────── X-axis (horizontal)
                   ╱  SEQUENCE / CAUSALITY
                  ╱   "Where in the process chain am I?"
                 ╱
                ╱
            Z-axis (depth)
            ABSTRACTION / DETAIL LEVEL
            "How granular is this view?"
```

**X — Sequence & Causality (horizontal).** Left-to-right encodes upstream-to-downstream, cause-to-effect. In this implementation: Marketing → Leads → Pipeline → Revenue → Retention. Panels connected by causal relationships are arranged left-to-right with directional arrow connectors.

**Y — Category & Segmentation (vertical).** Vertical spread encodes parallel segments and comparative peers. Same vertical level communicates peer status. In this implementation: Startup, SMB, Enterprise stacked vertically at each pipeline stage.

**Z — Abstraction & Detail Level (depth).** Near the camera is high-level summary; deeper into the screen is granular detail. Drilling down on a panel spawns child panels at greater Z-depth. The parent remains visible, providing context. In this implementation: 4 depth layers from KPI overview to account-level detail.

### The Complete Grammar

Every panel has a well-defined semantic address:

```
Panel Address = (X: process_step, Y: segment, Z: detail_level)
```

The grammar rules:

| Rule | Meaning | Spatial Encoding |
|---|---|---|
| Same X, Same Y, Different Z | Drill-down hierarchy of same metric in same segment | Depth layers |
| Same X, Different Y, Same Z | Comparative peers at same process step and detail level | Vertical spread |
| Different X, Same Y, Same Z | Sequential/causal steps for same segment at same detail level | Horizontal flow |
| Different X, Different Y, Same Z | Causal flow across different segments | Diagonal spread on XY plane |

The power of this grammar is **composability**. A single scene simultaneously expresses a causal pipeline flowing left-to-right (X), each stage broken into segments stacked vertically (Y), and any segment drillable into deeper detail along depth (Z). No encoding conflicts because each relationship type occupies an independent dimension.

### Secondary Visual Channels

Relationships that don't require a dedicated axis are encoded through secondary visual channels:

| Relationship | Visual Channel | Why Not an Axis? |
|---|---|---|
| **Complementary** (facets) | Angular rotation around focal point | Same (X, Y, Z) context — differs only in perspective |
| **Anomaly** (spotlight) | Visual emphasis: glow, scale, Z-pull | A state, not a structural relationship — any panel can become the focus |
| **Connectors** | Line style between panels | Reinforce spatial encoding with a secondary cue |

### Implementation in This Project

```
FRONT (Z=0, Summary)                    BACK (Z=2, Granular)
─────────────────────                   ─────────────────────

Y=2  ┌──────────┐  →  ┌──────────┐  →  ┌──────────┐
Ent  │ Ad Spend │     │  Leads   │     │ Pipeline │ ·····→  (drill into Z=1)
     │ (Enterp) │     │ (Enterp) │     │ (Enterp) │
     └──────────┘     └──────────┘     └──────────┘

Y=1  ┌──────────┐  →  ┌──────────┐  →  ┌──────────┐
SMB  │ Ad Spend │     │  Leads   │     │ Pipeline │
     │  (SMB)   │     │  (SMB)   │     │  (SMB)   │
     └──────────┘     └──────────┘     └──────────┘

Y=0  ┌──────────┐  →  ┌──────────┐  →  ┌──────────┐
Strt │ Ad Spend │     │  Leads   │     │ Pipeline │
     │(Startup) │     │(Startup) │     │(Startup) │
     └──────────┘     └──────────┘     └──────────┘

     X=0 (Cause)      X=1 (Middle)     X=2 (Effect)

     ─── → ─── = Causal flow (X-axis, solid arrows)
     │ stacked │ = Segment comparison (Y-axis, brackets)
     ·····→     = Drill-down available (Z-axis, into screen)
```

The hierarchy spans 4 depth layers with 30 panels total:

| Depth | Layer | Panels | Description |
|-------|-------|--------|-------------|
| Z=0 | Dashboard | 1 | Single KPI overview — 5 clickable cards, one per pipeline stage |
| Z=1 | Pipeline Summary | 5 | One bar chart per stage showing 3 segment bars (Startup/SMB/Enterprise) |
| Z=2 | Segment Detail | 15 | Full chart per pipeline stage × segment (5 × 3) |
| Z=3 | Deep Detail | 9 | Granular breakdowns (lead source, pipeline stage, account revenue) |

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

## Navigation

### Design Philosophy: Three Guarantees

The navigation system is built on three guarantees that make exploration risk-free:

| Guarantee | Promise to the User | Implementation |
|---|---|---|
| **Never Lost** | "I always know where I am and how to get back" | Persistent breadcrumbs, navigation helper, axis indicators; one-tap reset to home |
| **Always Reversible** | "Any action I take can be undone instantly" | Full navigation history stack; every transition has an inverse; no one-way doors |
| **Read-Only by Default** | "Looking around can't break anything" | Navigation is strictly separated from data mutation; all camera movements are non-destructive |

These address distinct failure modes. "Never Lost" prevents spatial disorientation — the most common anxiety in 3D interfaces. "Always Reversible" prevents commitment anxiety — users won't explore if they fear they can't return. "Read-Only by Default" prevents accidental consequences.

### Mouse / Touch

| Action | Input |
|--------|-------|
| Focus a panel | Click on it |
| Drill into child | Click a bar or KPI card within the panel |
| Return to overview | Click empty space |
| Pan the camera | Left-click drag on empty space |
| Zoom in/out | Scroll wheel |

### Keyboard

The keyboard mapping forms a coherent spatial system — arrow keys handle the two visible axes, while `,` and `.` handle depth (the `<` and `>` symbols on these keys serve as a built-in mnemonic):

```
              ↑ (Y: next segment)
              │
  ← (X: prev step) ─── → (X: next step)
              │
              ↓ (Y: prev segment)

  , (Z: roll up / shallower)    . (Z: drill down / deeper)
  < on keycap = come back       > on keycap = go further in
```

| Key | Action | Axis |
|-----|--------|------|
| Arrow Left / Right | Previous / next pipeline stage | X (blue) |
| Arrow Up / Down | Previous / next segment | Y (green) |
| `.` or `>` | Drill deeper | Z (amber) |
| `,` or `<` | Drill out (back to parent) | Z |
| Backspace | Navigate back in history | — |
| Home | Return to overview | — |

### UI Elements

- **Breadcrumbs** — ancestry chain from root to current panel, clickable for quick navigation. Color-coded separators indicate which axis was traversed at each step.
- **Navigation Helper** — contextual bar showing available neighbors along each axis with color-coded direction arrows (blue for X, green for Y, amber for Z).
- **Axis Indicators** — transient labels (fade after 3s) along viewport edges showing which grammar axis is which when navigating.

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

- **Spatial grammar over arbitrary layout** — panel positions are computed deterministically from semantic addresses, not manually placed. Adding a new panel only requires defining its `(processStep, segment, detailLevel)`. The layout is emergent from the data relationships, not chosen from a template menu.
- **2D charts in 3D space** via drei's `<Html transform>`. Research consensus favors placing familiar 2D visualizations as panels within a 3D spatial layout, combining readability of 2D charts with the spatial organization benefits of 3D. Full DOM interactivity (tooltips, hover, click) while correctly positioned in 3D.
- **Chart registry pattern** — `DashboardPanel` doesn't know what chart types exist. Components register in a `Map<string, Component>`. A new analytics domain just registers its own charts.
- **Click-to-drill via childMap** — parent panels pass `onItemClick` to their chart; clicking an item navigates to the Nth child panel. The mapping is generic: Z=0→Z=1 sorts children by pipeline step, Z=1→Z=2 sorts by segment.
- **Camera animation as primary interaction** — transitions are the killer feature. Animated camera movements between views create narrative flow and maintain spatial context during drill-downs. Spring physics via `@react-spring/three`.
- **Navigation history** — Zustand store tracks a full step history with axis labels, supporting back/forward and breadcrumb navigation. Every state is a snapshot of camera position and focused panel, so restoring is always safe and complete.

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

## Prior Art

### Commercial Products

| Product | Approach | Relevance |
|---|---|---|
| **Tableau on Vision Pro** | Native visionOS app with 3D globes, 2D charts in spatial windows | Enterprise BI vendor validating spatial analytics |
| **Flow Immersive** | No-code spatial data visualization with narrative steps | Closest commercial product; supports progressive web-to-XR enhancement |
| **Cognitive3D** | Spatial analytics platform with custom dashboards for XR | Dashboard customization relevant to UX thinking |
| **Microsoft SandDance** | Animated transitions between data visualization layouts | Pioneered "flying data points" paradigm inspiring drill-down transitions |

### Academic Research

Key findings from the Immersive Analytics community:

- **2D charts in 3D space work well.** The consensus is to place familiar 2D visualizations as panels within a 3D spatial layout, combining readability with spatial organization benefits.
- **Spatial memory is real and powerful.** Users remember _where_ they placed or found information in 3D space, aiding recall and reducing re-navigation.
- **Transitions are the killer feature.** Animated camera movements between views create narrative flow and maintain spatial context during drill-downs.
- **Progressive enhancement is essential.** The most successful systems start with a browser experience and enhance for headsets.

Selected references: Marriott et al., "Immersive Analytics" (Springer); Skarbez & Polys, "Immersive Analytics: Theory and Research Agenda" (Frontiers in Robotics and AI); Andrews et al., "Space to Think" (2010). Full reference list in [`requirements/3D UI and Data Analytics.md`](requirements/3D%20UI%20and%20Data%20Analytics.md).

## Roadmap

- **Phase 2** — Minimap navigation (isometric 3D grid), touch/mobile support, render-to-texture panels, mock API layer
- **Phase 3** — WebXR (VR/AR) via `@react-three/xr`, controller interaction mapping, VR-mode chart rendering (render-to-texture required — `<Html>` doesn't work in VR), testing on Meta Quest / Apple Vision Pro

## License

Accion Labs Innovation R&D. Internal use.
