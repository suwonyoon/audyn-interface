// Application Mode Types
export type AppMode = 'preparation' | 'analysis' | 'edit'

// Preparation stage steps
export type PreparationStep = 'slides-review' | 'agent-config'

// Section represents a divider between slides
// Slides between afterSlideIndex and the next section's afterSlideIndex belong to this section
export interface Section {
  id: string
  name: string
  afterSlideIndex: number // -1 means this section starts from the beginning (before slide 0)
}

// Agent configuration for analysis
export interface Agent {
  id: string
  name: string
  description: string
  basePrompt: string
  isPreset: boolean
  isEnabled: boolean
  icon?: string // Lucide icon name
}

// Preset agent type identifiers
export type PresetAgentType = 'design-review' | 'content-quality' | 'accessibility' | 'presentation-flow'

// Analysis comment from an agent
export interface AnalysisComment {
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
  elementId?: string // Optional: specific element this comment refers to
  resolved: boolean
  createdAt: Date
}

// Analysis for a single slide
export interface SlideAnalysis {
  slideId: string
  slideIndex: number
  comments: AnalysisComment[]
}

// Analysis for a section (group of slides)
export interface SectionAnalysis {
  sectionId: string
  sectionName: string
  summary: string
  slides: SlideAnalysis[]
  commentCount: {
    total: number
    byAgent: Record<string, number>
    bySeverity: Record<string, number>
  }
}

// Full analysis result for a presentation
export interface AnalysisResult {
  id: string
  presentationId: string
  sections: SectionAnalysis[]
  overallSummary: string
  analyzedAt: Date
  agentsUsed: string[]
  isComplete: boolean
  error?: string
}

// Analysis progress tracking
export interface AnalysisProgress {
  currentStep: string
  currentSlideIndex: number
  currentAgentId: string
  totalSlides: number
  totalAgents: number
  percentComplete: number
  // Section tracking (for section-based analysis)
  currentSectionIndex?: number
  currentSectionName?: string
  totalSections?: number
}

// API Key configuration for AI providers
export interface APIKeyConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model?: string
}

// =============================================================================
// Numerical Evaluation Types
// =============================================================================

// Evaluation metric definition per agent
export interface EvaluationMetric {
  id: string
  name: string
  weight: number              // 0.0 - 1.0, must sum to 1.0 per agent
  lens: string                // Detailed evaluation perspective
}

// Score for a single metric
export interface MetricScore {
  metricId: string
  metricName: string
  score: number               // 1-7 Likert scale
  reasoning: string           // Evidence-anchored explanation
  contentAnchors: string[]    // Specific quotes from slide
}

// Enhanced slide evaluation with scores
export interface SlideEvaluation {
  slideId: string
  slideIndex: number
  metricScores: MetricScore[]
  weightedTotal: number       // Calculated from scores * weights
  slideSummary?: string       // For context building
}

// Section-level score aggregation
export interface SectionScores {
  sectionId: string
  averageScore: number
  metricAverages: Record<string, number>
  lowestSlideIndex: number
}

// Extended analysis result with scores (DEPRECATED - kept for backwards compatibility)
export interface ScoredAnalysisResult extends AnalysisResult {
  slideEvaluations: SlideEvaluation[]
  sectionScores: SectionScores[]
  overallScore: number
  // New section-level evaluation data
  sectionEvaluations?: SectionEvaluationResult[]
}

// =============================================================================
// Per-Section Scoring Types (New)
// =============================================================================

// Individual agent's evaluation of a section
export interface AgentSectionEvaluation {
  agentId: string
  agentName: string
  sectionId: string
  metricScores: MetricScore[]
  weightedTotal: number
  sectionSummary: string
}

// All agent evaluations for a section
export interface SectionEvaluationResult {
  sectionId: string
  sectionName: string
  sectionIndex: number
  agentEvaluations: AgentSectionEvaluation[]
  averageScore: number
}

// Timeline data point for section-based scoring
export interface SectionTimelinePoint {
  sectionIndex: number
  sectionId: string
  sectionName: string
  agentScores: { agentId: string; agentName: string; score: number; color?: string }[]
  averageScore: number
}

// =============================================================================
// Change Tracking / Signature Types
// =============================================================================

// Signature for a single slide (content hash)
export interface SlideSignature {
  slideId: string
  slideIndex: number
  contentHash: string
}

// Signature for a section (aggregate of slide signatures)
export interface SectionSignature {
  sectionId: string
  hash: string
  slideCount: number
  slideSignatures: SlideSignature[]
  lastAnalyzed: Date
}

// Change status for a section
export type SectionChangeStatus = 'unchanged' | 'changed' | 'new'
