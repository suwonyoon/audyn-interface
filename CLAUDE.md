# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture Overview

Audyn is a client-side PowerPoint editor and AI analysis tool built with React 18, TypeScript, and Vite. It operates entirely in the browser with no backend server.

### Three-Mode System

The app has three distinct modes managed by `useModeStore`:

1. **Preparation Mode** (`/src/components/preparation/`) - Configure sections and select AI agents after file upload
2. **Analysis Mode** (`/src/components/analysis/`) - View AI-generated comments organized by section
3. **Edit Mode** (`/src/components/editor/`) - Canvas-based slide editing with Fabric.js

Flow: `Upload → Preparation → Analysis ↔ Edit`

### Core Libraries

- **Fabric.js** - Canvas rendering and manipulation (`/src/lib/canvas/`)
- **JSZip + fast-xml-parser** - PPTX parsing (`/src/lib/pptx/`)
- **PptxGenJS** - PPTX export (`/src/lib/export/`)
- **Zustand** - State management with multiple stores

### State Management (Zustand Stores)

All stores in `/src/stores/`:

- `presentationStore` - Presentation data, slides, elements, selection state
- `modeStore` - Current app mode navigation
- `sectionsStore` - Section dividers between slides
- `agentsStore` - AI agent configuration (preset + custom), API keys (persisted to localStorage)
- `analysisStore` - Analysis results, progress, comment resolution
- `historyStore` - Undo/redo

### PPTX Processing Pipeline

**Parsing** (`/src/lib/pptx/parser.ts`):
- Unzips PPTX → parses XML structure → extracts slides, theme, media
- Converts EMU units to pixels
- Individual parsers: `slideParser.ts`, `textParser.ts`, `shapeParser.ts`, `imageParser.ts`

**Export** (`/src/lib/export/exporter.ts`):
- Uses PptxGenJS to rebuild PPTX from internal representation
- Individual exporters: `slideExporter.ts`, `textExporter.ts`, `shapeExporter.ts`, `imageExporter.ts`

### Canvas System (`/src/lib/canvas/`)

`fabricCanvas.ts` contains `SlideCanvas` class that:
- Wraps Fabric.js canvas
- Converts between internal element types and Fabric objects
- Handles selection, modification, and text editing events
- `commitPendingChanges()` - Ensures canvas state is synced before export

Object creators: `textObject.ts`, `shapeObject.ts`, `imageObject.ts`

### AI Analysis (`/src/lib/api/analysisApi.ts`)

- Supports OpenAI (gpt-5-nano-2025-08-07) and Anthropic (claude-3-haiku) APIs
- User provides their own API key
- `runFullAnalysis()` orchestrates per-section, per-slide, per-agent analysis with progress tracking

### Type System (`/src/types/`)

Key types exported from `/src/types/index.ts`:
- `Presentation`, `Slide`, `SlideElement` - Core data structures
- `TextElement`, `ShapeElement`, `ImageElement` - Element types
- `AppMode`, `Section`, `Agent`, `AnalysisComment` - Mode/analysis types

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`)
