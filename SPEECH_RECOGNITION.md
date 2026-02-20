# Speech Recognition for Voice Navigation

This document explains the speech-to-text navigation feature integrated into the 3D Analytics Dashboard.

## Overview

Speech recognition enables **voice-based navigation** through the dashboard. Users speak the name of a panel, and the system automatically navigates to it. The implementation has **full VR support** with a dual-backend approach:

- **Desktop Mode**: Web Speech API (Chrome/Edge/Safari) for instant transcription
- **VR Mode**: Whisper WASM model for transcription (Web Speech API is unavailable in WebXR)

## Architecture Flow

```
User speaks → Speech-to-Text → API (with panel list) → Panel ID → Navigate
```

### Detailed Flow

1. **User speaks**: "Show me revenue chart"
2. **Speech Recognition** → Transcript: "Show me revenue chart"
3. **Dashboard Store** → Collects visible panels with IDs and titles
4. **API Call** to `/api/platforms/3danalytics/navigate-by-voice`
5. **API Response** returns matching panel ID
6. **Navigation** using existing `focusPanel(panelId)` function

## Implementation Guide

See the full documentation for:
- API endpoint specification
- Implementation strategies (keyword matching, fuzzy search, LLM-based)
- Example code for backend
- Testing instructions
- Troubleshooting guide

The build has been completed successfully and the feature is ready for testing once the API endpoint is implemented.
