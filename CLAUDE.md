# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Web Platform
```bash
npm run dev          # Start Vite dev server (http://localhost:3000)
npm run build:web    # Build web version to dist/web/
npm run preview      # Preview production build
npm run lint         # ESLint
```

### Office Add-in Platform
```bash
# First time: Install dev certificates
npx office-addin-dev-certs install

npm run dev:office   # Start HTTPS dev server (https://localhost:3001)
npm run build:office # Build Office add-in to dist/office/
npm run sideload     # Sideload add-in to PowerPoint
npm run stop         # Stop add-in and remove sideload
```

### Combined
```bash
npm run build        # Build both web and office versions
```

## Architecture Overview

Audyn is a client-side PowerPoint editor and AI analysis tool built with React 18, TypeScript, and Vite. It supports two platforms:

1. **Web Platform** - Full-featured browser-based editor with file upload, AI analysis, and canvas editing
2. **Office Add-in** - PowerPoint task pane for AI analysis only (editing done natively in PowerPoint)

### Directory Structure

```
src/
├── core/                        # Shared platform-agnostic code
│   ├── types/                   # TypeScript type definitions
│   ├── stores/                  # Zustand state management
│   ├── lib/                     # Core utilities and business logic
│   │   ├── api/                 # AI analysis API integration
│   │   ├── canvas/              # Fabric.js canvas abstraction
│   │   ├── export/              # PPTX export functionality
│   │   ├── pptx/                # PPTX parsing
│   │   └── utils/               # Helper utilities
│   ├── hooks/                   # Custom React hooks
│   └── platform/                # Platform abstraction (PlatformContext)
│
├── platforms/                   # Platform-specific code
│   ├── web/                     # Web platform
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # App shell (all 3 modes)
│   │   ├── adapters/           # Browser File API adapter
│   │   └── components/         # Web-only components
│   │
│   └── office/                  # Office Add-in platform
│       ├── main.tsx            # Office.onReady entry point
│       ├── App.tsx             # Task pane shell (Preparation + Analysis only)
│       ├── adapters/           # Office.js API adapter
│       └── components/         # Office-only components
│
├── components/                  # Shared UI components
│   ├── preparation/            # Preparation mode components
│   ├── analysis/               # Analysis mode components
│   └── editor/                 # Edit mode components (web only)
│
manifests/
└── manifest.xml                # Office Add-in manifest

taskpane.html                   # Office task pane entry HTML
index.html                      # Web entry HTML
```

### Three-Mode System

The app has three distinct modes managed by `useModeStore`:

1. **Preparation Mode** (`/src/components/preparation/`) - Configure sections and select AI agents after file upload
2. **Analysis Mode** (`/src/components/analysis/`) - View AI-generated comments organized by section
3. **Edit Mode** (`/src/components/editor/`) - Canvas-based slide editing with Fabric.js (web only)

Flow: `Upload → Preparation → Analysis ↔ Edit`

**Note:** Office Add-in only supports Preparation and Analysis modes. Editing is done natively in PowerPoint.

### Platform Abstraction

The `PlatformAdapter` interface (`/src/core/platform/`) abstracts platform-specific operations:

```typescript
interface PlatformAdapter {
  platform: 'web' | 'office'
  supportsCanvasEditing: boolean
  supportsFileUpload: boolean
  loadDocument(): Promise<ArrayBuffer | null>
  navigateToSlide(slideIndex: number): Promise<void>
  getDocumentName(): Promise<string>
  refreshDocument(): Promise<ArrayBuffer | null>
}
```

Use `usePlatform()` or `usePlatformOptional()` hooks to access platform capabilities.

### Core Libraries

- **Fabric.js** - Canvas rendering and manipulation (`/src/core/lib/canvas/`)
- **JSZip + fast-xml-parser** - PPTX parsing (`/src/core/lib/pptx/`)
- **PptxGenJS** - PPTX export (`/src/core/lib/export/`)
- **Zustand** - State management with multiple stores
- **Office.js** - Office Add-in APIs (office platform only)

### State Management (Zustand Stores)

All stores in `/src/core/stores/`:

- `presentationStore` - Presentation data, slides, elements, selection state
  - `loadPresentation(file)` - Load from File object
  - `loadPresentationFromBuffer(buffer, name)` - Load from ArrayBuffer (Office)
- `modeStore` - Current app mode navigation
- `sectionsStore` - Section dividers between slides
- `agentsStore` - AI agent configuration (preset + custom), API keys (persisted to localStorage)
- `analysisStore` - Analysis results, progress, comment resolution
- `historyStore` - Undo/redo

### PPTX Processing Pipeline

**Parsing** (`/src/core/lib/pptx/parser.ts`):
- Accepts both `File` and `ArrayBuffer` input types
- Unzips PPTX → parses XML structure → extracts slides, theme, media
- Converts EMU units to pixels
- Individual parsers: `slideParser.ts`, `textParser.ts`, `shapeParser.ts`, `imageParser.ts`

**Export** (`/src/core/lib/export/exporter.ts`):
- Uses PptxGenJS to rebuild PPTX from internal representation
- Individual exporters: `slideExporter.ts`, `textExporter.ts`, `shapeExporter.ts`, `imageExporter.ts`

### Canvas System (`/src/core/lib/canvas/`)

`fabricCanvas.ts` contains `SlideCanvas` class that:
- Wraps Fabric.js canvas
- Converts between internal element types and Fabric objects
- Handles selection, modification, and text editing events
- `commitPendingChanges()` - Ensures canvas state is synced before export

Object creators: `textObject.ts`, `shapeObject.ts`, `imageObject.ts`

### AI Analysis (`/src/core/lib/api/analysisApi.ts`)

- Supports OpenAI (gpt-5-nano-2025-08-07) and Anthropic (claude-3-haiku) APIs
- User provides their own API key
- `runFullAnalysis()` orchestrates per-section, per-slide, per-agent analysis with progress tracking

### Type System (`/src/core/types/`)

Key types exported from `/src/core/types/index.ts`:
- `Presentation`, `Slide`, `SlideElement` - Core data structures
- `TextElement`, `ShapeElement`, `ImageElement` - Element types
- `AppMode`, `Section`, `Agent`, `AnalysisComment` - Mode/analysis types

### Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:
- `@/*` maps to `src/*`
- `@core/*` maps to `src/core/*`
- `@platforms/*` maps to `src/platforms/*`

## Feature Comparison

| Feature | Web App | Office Add-in |
|---------|---------|---------------|
| File upload | Drag-drop / file picker | Uses active document |
| Canvas editing | Full Fabric.js editor | Use PowerPoint natively |
| Preparation mode | Yes | Yes |
| Analysis mode | Yes | Yes |
| Edit mode | Yes | No (redirects to Analysis) |
| Slide navigation | Internal | PowerPoint API |
| Export/Download | Browser download | Changes in PowerPoint |

## Office Add-in Development Notes

### Mac Setup
1. Install dev certificates: `npx office-addin-dev-certs install`
2. Start dev server: `npm run dev:office`
3. Sideload to PowerPoint: `npm run sideload`
4. Find button in Home tab → Audyn group → "Analyze Presentation"

### Manifest
The manifest (`manifests/manifest.xml`) defines:
- Add-in ID and metadata
- Ribbon button configuration
- Task pane source URL
- Required permissions (ReadWriteDocument)

### Icon Assets
Place icons in `/public/office/assets/`:
- `icon-16.png` - 16x16 pixels
- `icon-32.png` - 32x32 pixels
- `icon-80.png` - 80x80 pixels
