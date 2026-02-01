# Audyn Pipeline Overview

This document describes the complete data flow from PowerPoint input through LLM analysis to UI presentation.

---

## High-Level Architecture

```
                              AUDYN PIPELINE

+------------------+     +------------------+     +------------------+
|   PPTX INPUT     |     |  INTERNAL MODEL  |     |   LLM ANALYSIS   |
|                  |     |                  |     |                  |
|  Web: File API   |---->|  Presentation    |---->|  Section-level   |
|  Office: API     |     |  Slides          |     |  Scoring         |
|                  |     |  Elements        |     |  Comments        |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                         +------------------+     +------------------+
                         |    UI DISPLAY    |<----|  RESULT STORE    |
                         |                  |     |                  |
                         |  AnalysisSidebar |     |  analysisStore   |
                         |  ScoreTimeline   |     |  scoredResult    |
                         |  MetricBreakdown |     |  comments        |
                         +------------------+     +------------------+
```

---

## Stage 1: PPTX Processing

### Entry Points

**Web Platform** (`src/platforms/web/components/WelcomeScreen.tsx`):
- User uploads `.pptx` file via drag-drop or file picker
- Calls `usePresentationStore().loadPresentation(file)`
- File object passed directly to parser

**Office Add-in** (`src/platforms/office/adapters/officeAdapter.ts`):
- Reads active PowerPoint document via Office.js API
- `Office.context.document.getFileAsync()` retrieves file as compressed slices
- Slices combined into `ArrayBuffer`
- Calls `loadPresentationFromBuffer(buffer, name)`

### Parser Pipeline (`src/core/lib/pptx/parser.ts`)

The `parsePPTX()` function accepts both `File` and `ArrayBuffer` input:

```typescript
export type PPTXInput = File | ArrayBuffer

export async function parsePPTX(
  input: PPTXInput,
  options: ParsePPTXOptions = {}
): Promise<Presentation>
```

**Processing Steps:**

1. **Unzip PPTX** (JSZip)
   - PPTX is a ZIP archive containing XML files and media

2. **Parse `presentation.xml`**
   - Extract slide references and order (`p:sldIdLst`)
   - Get slide dimensions (EMU units)

3. **Parse Relationships** (`_rels/presentation.xml.rels`)
   - Map relationship IDs to target files
   - Locate theme, slide layouts, media

4. **Extract Media Files**
   - Images converted to base64 data URLs
   - Stored in `mediaMap` for element resolution

5. **Parse Theme** (`ppt/theme/theme1.xml`)
   - Color scheme (dk1, lt1, accent1-6, hlink, etc.)
   - Font scheme (major/minor fonts)

6. **Parse Each Slide** (loop through `ppt/slides/slide{n}.xml`)
   - Parse slide relationships for notes, images
   - Extract speaker notes if available
   - Parse slide elements (shapes, text, images)

7. **Parse Slide Dimensions**
   - Convert EMU to pixels using `emuToPixels()`
   - Default: 10" x 7.5" at 914400 EMU/inch

8. **Parse Metadata** (`docProps/core.xml`)
   - Author, title, created/modified dates

### Key Parsers

| File | Purpose |
|------|---------|
| `parser.ts` | Main orchestrator, theme parsing, metadata |
| `slideParser.ts` | Slide structure, backgrounds, shape groups |
| `shapeParser.ts` | Shapes, text boxes, geometry |
| `textParser.ts` | Rich text content (paragraphs, runs, formatting) |
| `imageParser.ts` | Images with base64 encoding |
| `notesParser.ts` | Speaker notes extraction |

### Output: `Presentation` Object

```typescript
interface Presentation {
  id: string
  name: string
  slides: Slide[]
  theme: Theme
  slideWidth: number    // pixels
  slideHeight: number   // pixels
  metadata: {
    author: string
    title: string
    created: Date
    modified: Date
  }
}
```

---

## Stage 2: Content Extraction for LLM

### Function: `extractSlideContent()` (`src/core/lib/api/analysisApi.ts:99`)

Converts slide elements to plain text representation:

```typescript
export function extractSlideContent(slide: Slide): string
```

**Element Mapping:**

| Element Type | Text Output |
|-------------|-------------|
| Text | `[Text]: Slide title text here` |
| Shape with text | `[Shape with text]: Button label` |
| Shape (no text) | `[Shape]: rectangle` |
| Image | `[Image]: 1024x768px` |
| Empty slide | `[Empty slide]` |

**Example Output:**
```
[Text]: Q3 Revenue Analysis
[Text]: Key Findings
[Shape with text]: +15% YoY Growth
[Image]: 800x600px
```

### Section Content Aggregation

**Function:** `extractSectionContent()` (`analysisApi.ts:364`)

Combines multiple slides with markers:

```typescript
export function extractSectionContent(
  slides: { slide: Slide; index: number }[]
): string
```

**Output Format:**
```
=== SLIDE 1 ===
[Text]: Introduction
[Image]: 1024x768px

=== SLIDE 2 ===
[Text]: Key Points
[Shape with text]: Point 1
```

---

## Stage 3: LLM Prompts & Calls

### Prompt Construction

**Function:** `buildSectionScoringPrompt()` (`analysisApi.ts:381`)

The prompt includes:

1. **Agent's Base Prompt** - Analysis instructions and persona
2. **Section Context** - Which section, how many slides
3. **Section Content** - Extracted text from all slides
4. **Evaluation Metrics** - With weights and "lens" descriptions
   ```
   - ID: "content-quality" | Name: "Content Quality" (weight: 40%):
     Evaluates clarity, accuracy, and depth of information...
   ```
5. **Scoring Scale** - 1-7 Likert scale definition
6. **Output Format** - JSON structure specification

### API Calls

**OpenAI** (`analyzeWithOpenAI()`):
- Endpoint: `https://api.openai.com/v1/responses`
- Model: `gpt-5-nano-2025-08-07`
- Uses Responses API format

**Anthropic** (`analyzeWithAnthropic()`):
- Endpoint: `https://api.anthropic.com/v1/messages`
- Model: `claude-3-haiku-20240307`
- Max tokens: 4000

### Orchestration: `runScoredAnalysis()` (`analysisApi.ts:705`)

**Loop Structure:** `sections x agents` (not per-slide)

```
For each section:
  For each agent:
    1. Extract section content
    2. Build scoring prompt with metrics
    3. Call LLM API
    4. Parse response
    5. Update progress callback
    6. Small delay (100ms) for rate limiting
```

**Progress Tracking:**
```typescript
interface AnalysisProgress {
  currentStep: string        // e.g., "Evaluating 'Intro' with Design Agent..."
  currentSlideIndex: number
  currentAgentId: string
  totalSlides: number
  totalAgents: number
  percentComplete: number    // 0-100
}
```

---

## Stage 4: LLM Response Processing

### Expected Response Structure (JSON)

```json
{
  "metrics": [
    {
      "metricId": "content-quality",
      "metricName": "Content Quality",
      "score": 5,
      "reasoning": "The section presents clear information...",
      "contentAnchors": ["Q3 Revenue", "specific quote from slide"]
    }
  ],
  "sectionSummary": "This section effectively introduces the quarterly results...",
  "slideComments": [
    {
      "slideIndex": 0,
      "comments": [
        {
          "severity": "warning",
          "category": "Visual Design",
          "title": "Low contrast text",
          "description": "The gray text on white background...",
          "suggestion": "Increase text contrast ratio to at least 4.5:1"
        }
      ]
    }
  ]
}
```

### Parsing: `parseSectionScoringResponse()` (`analysisApi.ts:469`)

**Validation Steps:**
1. Extract JSON from response (handles markdown code blocks)
2. Validate score range (clamp to 1-7)
3. Match metric IDs to expected metrics (with fallback name matching)
4. Fill missing metrics with default score (4)
5. Map `slideIndex` to actual `slideId`

### Score Calculation: `calculateWeightedScore()` (`analysisApi.ts:681`)

```typescript
function calculateWeightedScore(
  metricScores: MetricScore[],
  metrics: EvaluationMetric[]
): number
```

Computes weighted average:
```
totalScore = sum(score[i] * weight[i])
weightedAverage = totalScore / sum(weights)
```

### Output Types

```typescript
interface AgentSectionEvaluation {
  agentId: string
  agentName: string
  sectionId: string
  metricScores: MetricScore[]
  weightedTotal: number
  sectionSummary: string
}

interface SectionEvaluationResult {
  sectionId: string
  sectionName: string
  sectionIndex: number
  agentEvaluations: AgentSectionEvaluation[]
  averageScore: number  // Average across all agents
}

interface AnalysisComment {
  id: string
  agentId: string
  agentName: string
  slideId: string
  sectionId: string
  severity: 'info' | 'warning' | 'error' | 'suggestion'
  category: string
  title: string
  description: string
  suggestion?: string
  resolved: boolean
  createdAt: Date
}
```

---

## Stage 5: UI Presentation

### State Management: `analysisStore.ts` (`src/core/stores/analysisStore.ts`)

**Key State:**
```typescript
interface AnalysisState {
  currentAnalysis: AnalysisResult | null
  scoredResult: ScoredAnalysisResult | null
  isAnalyzing: boolean
  progress: AnalysisProgress | null
  error: string | null
  selectedSectionId: string | null
  expandedSlideIds: string[]
  selectedCommentId: string | null
  analysisSignatures: Map<string, SectionSignature>  // Change tracking
}
```

**Key Actions:**
- `startScoredAnalysis()` - Initiates analysis
- `cancelAnalysis()` - Aborts in-progress analysis
- `markCommentResolved(commentId)` - Toggle comment resolution
- `setSelectedSection(sectionId)` - Navigate between sections
- `getSectionChangeStatus(sectionId, slides)` - Check if section changed since analysis

**Query Methods:**
- `getScoreTimeline()` - Section scores for timeline chart
- `getSectionEvaluation(sectionId)` - Get detailed section results
- `getLowestScoringSlides(n)` - Find slides needing attention
- `getUnresolvedCommentCount()` - Count open issues

### UI Components (`src/components/analysis/`)

| Component | Purpose |
|-----------|---------|
| `AnalysisMode.tsx` | Main container, orchestrates layout |
| `AnalysisSidebar.tsx` | Section navigation, overall score, stats summary |
| `AnalysisMainPanel.tsx` | Section details, score timeline, comments list |
| `SlideGallery.tsx` | Slide thumbnails with comment count badges |
| `ScoreDisplay.tsx` | Circular score visualization (1-7 scale) |
| `ScoreTimeline.tsx` | Line chart of section scores by agent |
| `MetricBreakdown.tsx` | Detailed metric scores with evidence anchors |
| `SectionBlockSelector.tsx` | Section selection dropdown/tabs |
| `AnalysisProgress.tsx` | Progress bar during analysis |

### Comment Display Features

- **Severity Icons:**
  - `error` - Red exclamation
  - `warning` - Yellow triangle
  - `suggestion` - Blue lightbulb
  - `info` - Gray info circle

- **Functionality:**
  - Agent attribution (colored badge)
  - Resolution checkbox (persisted in store)
  - Suggestion highlighting (if provided)
  - Click to navigate to slide

---

## Key Data Types Summary

### Core Presentation Types
- `Presentation` - Top-level container
- `Slide` - Individual slide with elements
- `SlideElement` - Union of `TextElement | ShapeElement | ImageElement`

### Analysis Configuration
- `Section` - Divider between slides
- `Agent` - Analysis agent configuration
- `EvaluationMetric` - Scoring criteria with weight

### Analysis Results
- `AnalysisComment` - Individual feedback item
- `MetricScore` - Score for single metric with reasoning
- `AgentSectionEvaluation` - One agent's evaluation of one section
- `SectionEvaluationResult` - All agents' evaluations for a section
- `ScoredAnalysisResult` - Complete analysis with all scores

---

## Key Files Reference

| File Path | Purpose |
|-----------|---------|
| `src/core/lib/pptx/parser.ts` | Main PPTX parser entry point |
| `src/core/lib/pptx/slideParser.ts` | Individual slide parsing |
| `src/core/lib/pptx/textParser.ts` | Rich text extraction |
| `src/core/lib/pptx/shapeParser.ts` | Shape geometry and text |
| `src/core/lib/pptx/imageParser.ts` | Image extraction and encoding |
| `src/core/lib/api/analysisApi.ts` | LLM integration and prompts |
| `src/core/stores/analysisStore.ts` | Analysis state management |
| `src/core/stores/presentationStore.ts` | Presentation state |
| `src/core/types/modes.ts` | Analysis type definitions |
| `src/components/analysis/` | UI components for results display |
| `src/platforms/web/components/WelcomeScreen.tsx` | Web file upload |
| `src/platforms/office/adapters/officeAdapter.ts` | Office.js integration |
