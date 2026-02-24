import { create } from 'zustand';
import type {
  DashboardState,
  PanelConfig,
  CausalLink,
  CameraTarget,
  NavigationHistory,
} from '../types/index.ts';
import { grammarLayout } from '../layouts/grammarLayout.ts';
import {
  classifyIntent,
  navigateByVoice,
  generateVisualization,
} from '../services/chartApi.ts';
import { speakInsights } from '../utils/sarvamTTS.ts';

/** Default overview camera — centered on the grammar layout */
const OVERVIEW_CAMERA: CameraTarget = {
  position: [0, 0, 6],
  lookAt: [0, 0, -8],
};

const EMPTY_NAV: NavigationHistory = { steps: [], currentIndex: -1 };

/** Compute a camera position 3 units in front of a panel along +Z */
function cameraForPanel(panels: PanelConfig[], panelId: string): CameraTarget {
  const positions = grammarLayout(panels);
  const idx = panels.findIndex((p) => p.id === panelId);
  if (idx === -1) return OVERVIEW_CAMERA;

  const [px, py, pz] = positions[idx].position;
  return {
    position: [px, py, pz + 3],
    lookAt: [px, py, pz],
  };
}

/** Compute overview camera dynamically from all panel positions */
export function overviewCameraFromPanels(panels: PanelConfig[]): CameraTarget {
  if (panels.length === 0) return OVERVIEW_CAMERA;

  const positions = grammarLayout(panels);
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const pos of positions) {
    const [x, y, z] = pos.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const spanX = maxX - minX + 4;
  const spanY = maxY - minY + 4;
  const depthSpan = maxZ - minZ;
  const dist =
    Math.max(spanX, spanY) / (2 * Math.tan(Math.PI / 6)) + depthSpan / 2 + 2;

  return {
    position: [centerX, centerY, maxZ + dist],
    lookAt: [centerX, centerY, centerZ],
  };
}

/** Detect which axis a navigation move is along */
function detectAxis(
  panels: PanelConfig[],
  fromId: string | null,
  toId: string,
): 'x' | 'y' | 'z' {
  if (!fromId) return 'x';
  const from = panels.find((p) => p.id === fromId);
  const to = panels.find((p) => p.id === toId);
  if (!from || !to) return 'x';

  const dx = Math.abs(from.semantic.processStep - to.semantic.processStep);
  const dy = Math.abs(
    (from.semantic.segment ?? 0) - (to.semantic.segment ?? 0),
  );
  const dz = Math.abs(from.semantic.detailLevel - to.semantic.detailLevel);

  if (dz > 0) return 'z';
  if (dy > dx) return 'y';
  return 'x';
}

/** All panel IDs — every panel is always visible */
function allPanelIds(panels: PanelConfig[]): string[] {
  return panels.map((p) => p.id);
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  panels: [],
  causalLinks: [],
  focusedPanelId: null,
  navigation: EMPTY_NAV,
  visiblePanelIds: [],
  cameraTarget: OVERVIEW_CAMERA,
  isTransitioning: false,
  isDragging: false,
  isLoading: false,
  error: null,
  isInVR: false,
  currentInsights: null,

  setPanels: (panels: PanelConfig[]) => {
    // Assign group 0 to initial panels if not already set
    const panelsWithGroups = panels.map(p => ({
      ...p,
      visualizationGroupId: p.visualizationGroupId ?? 0,
    }));

    const root = panelsWithGroups.find((p) => !p.parentId);
    const target = root
      ? cameraForPanel(panelsWithGroups, root.id)
      : overviewCameraFromPanels(panelsWithGroups);
    set({
      panels: panelsWithGroups,
      visiblePanelIds: allPanelIds(panelsWithGroups),
      focusedPanelId: root?.id ?? null,
      cameraTarget: target,
      navigation: root
        ? {
            steps: [
              {
                panelId: root.id,
                axis: 'z',
                label: root.title,
                cameraTarget: target,
              },
            ],
            currentIndex: 0,
          }
        : EMPTY_NAV,
    });
  },

  setCausalLinks: (links: CausalLink[]) => set({ causalLinks: links }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  setInVR: (isInVR: boolean) => set({ isInVR }),

  focusPanel: (id: string) => {
    const { panels, focusedPanelId } = get();
    if (focusedPanelId === id) return; // Already focused — no-op
    const axis = detectAxis(panels, focusedPanelId, id);
    get().navigateTo(id, axis);
  },

  unfocus: () => {
    get().navigateHome();
  },

  navigateTo: (panelId: string, axis: 'x' | 'y' | 'z') => {
    const { panels, navigation } = get();
    const target = cameraForPanel(panels, panelId);
    const panel = panels.find((p) => p.id === panelId);

    // Current path up to this point
    const currentPath = navigation.steps.slice(0, navigation.currentIndex + 1);

    // If this panel is already in the current path, truncate back to it
    const existingIdx = currentPath.findIndex((s) => s.panelId === panelId);
    if (existingIdx >= 0) {
      const truncated = currentPath.slice(0, existingIdx + 1);
      set({
        focusedPanelId: panelId,
        cameraTarget: target,
        isTransitioning: true,
        navigation: { steps: truncated, currentIndex: existingIdx },
        visiblePanelIds: allPanelIds(panels),
      });
      return;
    }

    // New panel: append to the path
    currentPath.push({
      panelId,
      axis,
      label: panel?.title ?? panelId,
      cameraTarget: target,
    });

    set({
      focusedPanelId: panelId,
      cameraTarget: target,
      isTransitioning: true,
      navigation: { steps: currentPath, currentIndex: currentPath.length - 1 },
      visiblePanelIds: allPanelIds(panels),
    });
  },

  navigateBack: () => {
    const { panels, focusedPanelId } = get();
    if (!focusedPanelId) return;
    const current = panels.find((p) => p.id === focusedPanelId);
    if (!current?.parentId) return; // Already at root — no-op
    // Go to parent panel
    get().focusPanel(current.parentId);
  },

  navigateForward: () => {
    const { navigation, panels } = get();
    if (navigation.currentIndex >= navigation.steps.length - 1) return;
    const newIndex = navigation.currentIndex + 1;
    const step = navigation.steps[newIndex];
    set({
      focusedPanelId: step.panelId,
      cameraTarget: step.cameraTarget,
      isTransitioning: true,
      navigation: { ...navigation, currentIndex: newIndex },
      visiblePanelIds: allPanelIds(panels),
    });
  },

  navigateHome: () => {
    const { panels } = get();
    const root = panels.find((p) => !p.parentId);
    if (!root) return;
    const target = cameraForPanel(panels, root.id);
    set({
      focusedPanelId: root.id,
      cameraTarget: target,
      isTransitioning: true,
      navigation: {
        steps: [
          {
            panelId: root.id,
            axis: 'z',
            label: root.title,
            cameraTarget: target,
          },
        ],
        currentIndex: 0,
      },
      visiblePanelIds: allPanelIds(panels),
    });
  },

  navigateToStep: (index: number) => {
    const { navigation, panels } = get();
    if (index < 0 || index >= navigation.steps.length) return;
    const step = navigation.steps[index];
    // Truncate: discard steps beyond the target so breadcrumb shows only the current path
    const truncatedSteps = navigation.steps.slice(0, index + 1);
    set({
      focusedPanelId: step.panelId,
      cameraTarget: step.cameraTarget,
      isTransitioning: true,
      navigation: { steps: truncatedSteps, currentIndex: index },
      visiblePanelIds: allPanelIds(panels),
    });
  },

  setTransitioning: (isTransitioning: boolean) => set({ isTransitioning }),
  setDragging: (isDragging: boolean) => set({ isDragging }),
  setCurrentInsights: (insights: string[] | null) =>
    set({ currentInsights: insights }),

  /**
   * Handle voice navigation - classifies intent (navigation vs visualization),
   * then either navigates to a panel or handles visualization request.
   */
  handleVoiceNavigation: async (transcript: string) => {
    const { panels } = get();

    try {
      // Step 1: Classify user intent
      console.log('[Voice] Classifying intent for:', transcript);
      const intentResponse = await classifyIntent({ query: transcript });
      console.log('[Voice] Intent classification:', intentResponse);

      // Step 2: Handle based on intent
      if (intentResponse.intent === 'navigation') {
        // Navigation flow - find and navigate to the panel
        const availablePanels = panels.map((panel) => ({
          id: panel.id,
          title: panel.title,
        }));

        console.log('[Voice Navigation] Sending to API:', {
          transcript,
          availablePanels,
        });

        const response = await navigateByVoice({
          query: transcript,
          availablePanels,
        });

        console.log('[Voice Navigation] API Response:', response);

        // Validate that the returned panel ID exists
        const targetPanel = panels.find((p) => p.id === response.panelId);
        if (!targetPanel) {
          throw new Error(
            `Panel "${response.panelId}" not found in current dashboard`,
          );
        }

        // Navigate to the panel
        get().focusPanel(response.panelId);

        return {
          success: true,
          intent: 'navigation',
          panelId: response.panelId,
        };
      } else {
        // Visualization flow - generate charts from natural language query
        console.log('[Voice Visualization] Request:', {
          query: transcript,
          confidence: intentResponse.confidence,
          reasoning: intentResponse.reasoning,
        });

        // Call visualization generation API
        const vizResponse = await generateVisualization({ query: transcript });

        console.log('[Voice Visualization] API Response:', {
          chartsGenerated: vizResponse.data.length,
          narrative: vizResponse.narrative,
          insights: vizResponse.keyInsights,
          meta: vizResponse.meta,
        });

        const { isInVR, panels: existingPanels } = get();

        // Detect VR mode from existing panel structure (multiple groups = VR mode)
        // This handles cases where isInVR might not be set yet due to timing
        const existingGroups = [...new Set(existingPanels.map(p => p.visualizationGroupId ?? 0))];
        const hasMultipleGroups = existingGroups.length > 1;
        const effectiveVRMode = isInVR || hasMultipleGroups;

        console.log('[VoiceViz] Mode check:', {
          isInVR,
          effectiveVRMode,
          existingPanelCount: existingPanels.length,
          existingGroups
        });

        // Determine next visualization group ID
        const maxGroupId = existingPanels.length > 0
          ? Math.max(...existingPanels.map(p => p.visualizationGroupId ?? 0))
          : -1;
        const nextGroupId = maxGroupId + 1;

        console.log('[VoiceViz] Group ID calculation:', { maxGroupId, nextGroupId });

        // Convert API charts to PanelConfig format
        // IMPORTANT: Keep semantic addresses unchanged to preserve semantic structure
        const newPanels: PanelConfig[] = vizResponse.data.map((chart) => ({
          id: chart.id,
          title: chart.title,
          chartType: chart.chartType as any, // API types match our chart registry
          size: chart.size,
          data: chart.data,
          semantic: chart.semantic, // Keep semantic addresses as-is from API
          processLabel: chart.processLabel,
          parentId: chart.parentId ?? undefined,
          segmentLabel: chart.segmentLabel ?? undefined,
          // In VR mode (or if we already have multiple groups), assign incrementing group ID
          visualizationGroupId: effectiveVRMode ? nextGroupId : 0,
        }));

        console.log('[VoiceViz] New panels created:', {
          count: newPanels.length,
          groupId: newPanels[0]?.visualizationGroupId
        });

        // Generate causalLinks from parentId relationships in new panels
        const newLinks: CausalLink[] = newPanels
          .filter(p => p.parentId)
          .map(p => ({
            from: p.parentId!,
            to: p.id,
            type: 'hierarchy' as const,
          }));

        console.log('[VoiceViz] Generated causalLinks:', newLinks.length);

        // VR mode logic: ALWAYS append unless it's the very first group
        // Desktop mode: Always replace to prevent overlapping
        if (effectiveVRMode) {
          if (existingPanels.length > 0) {
            // VR mode with existing panels: Append new group
            console.log('[VoiceViz] VR mode - APPENDING new group to existing panels');
            const combinedPanels = [...existingPanels, ...newPanels];
            const existingLinks = get().causalLinks;
            const combinedLinks = [...existingLinks, ...newLinks];

            console.log('[VoiceViz] Combined panels:', {
              total: combinedPanels.length,
              groups: [...new Set(combinedPanels.map(p => p.visualizationGroupId ?? 0))]
            });

            set({
              panels: combinedPanels,
              visiblePanelIds: allPanelIds(combinedPanels),
              causalLinks: combinedLinks,
            });

            // Don't auto-focus - let user manually turn head to see new group
            console.log('[VoiceViz] New group added - user can turn head to see it');
          } else {
            // VR mode with no existing panels: Create first group (group 0)
            console.log('[VoiceViz] VR mode - Creating FIRST group (no existing panels)');
            set({
              panels: newPanels,
              visiblePanelIds: allPanelIds(newPanels),
              causalLinks: newLinks,
            });

            // Navigate to the first generated panel
            if (newPanels.length > 0) {
              get().focusPanel(newPanels[0].id);
            }
          }
        } else {
          // Desktop mode: Replace entire panel structure with new visualization
          // This prevents overlapping panels from multiple generations
          console.log('[VoiceViz] Desktop mode - REPLACING all panels');
          set({
            panels: newPanels,
            visiblePanelIds: allPanelIds(newPanels),
            causalLinks: newLinks,
          });

          // Navigate to the first generated panel in desktop mode
          if (newPanels.length > 0) {
            get().focusPanel(newPanels[0].id);
          }
        }

        // Display and read out the key insights using Sarvam AI text-to-speech
        if (vizResponse.keyInsights && vizResponse.keyInsights.length > 0) {
          console.log(
            '[Voice Visualization] Reading insights:',
            vizResponse.keyInsights,
          );

          // Show insights notification to user
          get().setCurrentInsights(vizResponse.keyInsights);

          // Use Sarvam AI with optimized settings for natural-sounding speech
          speakInsights(vizResponse.keyInsights, {
            language: 'en-IN', // Sarvam AI English (India)
            speaker: 'sunny', // Natural-sounding voice
            speed: 1.2, // Slightly slower for clarity
          });

          // Auto-dismiss insights after 20 seconds (enough time to read them)
          setTimeout(() => {
            get().setCurrentInsights(null);
          }, 20000);
        }

        return {
          success: true,
          intent: 'visualization',
          chartsGenerated: vizResponse.data.length,
          narrative: vizResponse.narrative,
          keyInsights: vizResponse.keyInsights,
          panelIds: newPanels.map((p) => p.id),
        };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Voice command failed';
      console.error('[Voice] Error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
}));
