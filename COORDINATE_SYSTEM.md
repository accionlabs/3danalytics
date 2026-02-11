# 3D Dashboard Coordinate System & Navigation Design

## Spatial Organization

### Three-Axis Semantic Grid

The dashboard uses a **grammar-based 3D layout** where each axis has semantic meaning:

```
X-AXIS (Left ← → Right): Process Steps / Pipeline Stages
├── Marketing Spend
├── Leads Generated
├── Pipeline Value
├── Closed Revenue
└── Retention & Churn

Y-AXIS (Down ↓ ↑ Up): Customer Segments
├── Enterprise
├── SMB (Small/Medium Business)
└── Startup

Z-AXIS (Near ← → Far): Detail Levels / Drill-Down Depth
├── Level 0 (z=-8):  High-level overview panels
├── Level 1 (z=-12): Segment-specific breakdowns
└── Level 2 (z=-16): Detailed drill-downs
```

### Spacing Constants

```typescript
X_SPACING = 4 units  // Distance between process steps
Y_SPACING = 3 units  // Distance between segments
Z_SPACING = 4 units  // Distance between detail levels
Z_BASE = -8          // Starting Z position
```

### Panel Positioning Formula

```
Position.x = processStep * 4 - (maxStep * 4) / 2     // Centered on X
Position.y = segment * 3 - (maxSegment * 3) / 2      // Centered on Y
Position.z = -8 - (detailLevel * 4)                  // Deeper as you drill
```

## Hierarchical Relationships

### Parent-Child Structure

Panels form a tree hierarchy:
- **Root panels (Z=0)**: Top-level metrics across all segments
- **Child panels (Z=1)**: Segment-specific breakdowns
- **Grandchild panels (Z=2)**: Detailed drill-downs

Example hierarchy:
```
SaaS Dashboard (root)
├── Marketing Spend (Z=0, X=0)
│   ├── SMB Marketing (Z=1, X=0, Y=0)
│   │   └── Marketing by Channel (Z=2)
│   ├── Enterprise Marketing (Z=1, X=0, Y=1)
│   └── Startup Marketing (Z=1, X=0, Y=2)
├── Leads Generated (Z=0, X=1)
│   ├── SMB Leads (Z=1, X=1, Y=0)
│   └── Enterprise Leads (Z=1, X=1, Y=1)
...
```

## Current Navigation System

### VR Controller Mapping

**Left Thumbstick (Spatial Navigation):**
- **Left/Right**: Move along X-axis (previous/next process step)
- **Up/Down**: Move along Y-axis (different segments)

**Right Thumbstick (Depth Navigation):**
- **Up**: Drill into details (Z+, deeper into hierarchy)
- **Down**: Zoom out (Z-, back to overview)

**Buttons:**
- **Trigger**: Focus panel you're gazing at (gaze-based selection)
- **Grip**: Navigate back to parent panel
- **A or X**: Return to home/root view

**Gaze Interaction:**
- Look at any panel → it highlights
- Pull trigger → camera flies to that panel

## Navigation Philosophy

### 1. Spatial Semantics
Physical movement in VR space maps to logical relationships:
- Moving right = progressing through pipeline stages
- Moving up/down = switching between customer segments
- Moving forward/back = drilling into/out of details

### 2. Multiple Navigation Modes

**Mode A: Gaze + Select (Fast jumps)**
- Look anywhere in the space
- Pull trigger to teleport there
- Best for: Jumping to distant panels

**Mode B: Thumbstick (Precise control)**
- Navigate step-by-step through adjacent panels
- Best for: Exploring related metrics

**Mode C: Hybrid (Recommended)**
- Gaze to jump to a general area
- Thumbsticks to fine-tune within that area

## Visual Relationship Indicators

### Connectors
Curved lines (causal links) show relationships between panels:
- Marketing → Leads: Shows impact
- Leads → Pipeline: Shows conversion
- Pipeline → Revenue: Shows closure
- Revenue → Retention: Shows lifecycle

### Color Coding
Different colors indicate chart types:
- **Blue**: Bar charts (comparisons)
- **Purple**: KPI metrics (key numbers)
- **Green**: Line charts (trends)
- **Orange**: Funnels (conversion flows)

## Proposed Navigation Enhancements

### 1. Axis Indicators
Show floating labels at edges of viewport:
- "← Previous Stage | Next Stage →" (X-axis)
- "↓ Enterprise | SMB | Startup ↑" (Y-axis)
- "← Overview | Details →" (Z-axis)

### 2. Available Directions
Show arrows or glowing paths indicating where you can navigate:
- Bright arrows = panel exists in that direction
- Dim arrows = no panel available
- Pulsing arrows = recommended next step

### 3. Minimap / Compass
Small overhead view showing:
- Your current position in the grid
- All available panels
- Your navigation history (breadcrumb trail)

### 4. Smart Navigation Hints
Context-sensitive hints based on current panel:
- "Pull trigger to drill into {segment} details"
- "Move right to see {next process step}"
- "Press grip to return to overview"

## Implementation Strategy

### Phase 1: Enhanced Visual Feedback ✅
- [x] Gaze highlighting (already implemented)
- [x] Color-coded panels (already implemented)
- [x] Spatial layout (already implemented)

### Phase 2: Navigation Guides (Next)
- [ ] Add axis labels floating in space
- [ ] Show available direction indicators
- [ ] Add breadcrumb trail visualization
- [ ] Improve panel focus animations

### Phase 3: Advanced Features (Future)
- [ ] Voice commands ("Go to Revenue", "Show Enterprise")
- [ ] Minimap overlay
- [ ] Gesture-based navigation
- [ ] Collaborative VR (multi-user viewing)
