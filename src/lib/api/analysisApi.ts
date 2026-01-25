import type {
  Presentation,
  Slide,
  Section,
  Agent,
  APIKeyConfig,
  AnalysisResult,
  SectionAnalysis,
  SlideAnalysis,
  AnalysisComment,
  AnalysisProgress,
  EvaluationMetric,
  MetricScore,
  SlideEvaluation,
  SectionScores,
  ScoredAnalysisResult,
  AgentSectionEvaluation,
  SectionEvaluationResult,
} from '@/types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Extract text content from OpenAI API response (handles multiple response formats)
 */
function extractOpenAIContent(data: any): string {
  // Try direct output_text (convenience field)
  if (data.output_text && typeof data.output_text === 'string') {
    console.log('[extractOpenAIContent] Found data.output_text')
    return data.output_text
  }

  // Try nested output array (Responses API format)
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === 'message' && item.content && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.type === 'output_text' && content.text) {
            console.log('[extractOpenAIContent] Found data.output[].content[].text')
            return content.text
          }
          if (content.text) {
            console.log('[extractOpenAIContent] Found data.output[].content[].text (no type)')
            return content.text
          }
        }
      }
      // Direct text in output item
      if (item.text) {
        console.log('[extractOpenAIContent] Found data.output[].text')
        return item.text
      }
    }
  }

  // Try Chat Completions format (choices array)
  if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
    const choice = data.choices[0]
    if (choice.message?.content) {
      console.log('[extractOpenAIContent] Found data.choices[0].message.content')
      return choice.message.content
    }
    if (choice.text) {
      console.log('[extractOpenAIContent] Found data.choices[0].text')
      return choice.text
    }
  }

  // Try direct content field
  if (data.content && typeof data.content === 'string') {
    console.log('[extractOpenAIContent] Found data.content')
    return data.content
  }

  // Try text field
  if (data.text && typeof data.text === 'string') {
    console.log('[extractOpenAIContent] Found data.text')
    return data.text
  }

  console.warn('[extractOpenAIContent] Could not find content in response:', Object.keys(data))
  return '{}'
}

// Partial comment type without metadata (used during API parsing)
interface PartialComment {
  severity: 'info' | 'warning' | 'error' | 'suggestion'
  category: string
  title: string
  description: string
  suggestion?: string
}

/**
 * Extract text content from a slide for AI analysis
 */
export function extractSlideContent(slide: Slide): string {
  const parts: string[] = []

  for (const element of slide.elements) {
    if (element.type === 'text') {
      const textContent = element.content
        .flatMap((c) => c.paragraphs)
        .flatMap((p) => p.runs)
        .map((r) => r.text)
        .join(' ')
        .trim()

      if (textContent) {
        parts.push(`[Text]: ${textContent}`)
      }
    } else if (element.type === 'shape') {
      const shapeText = element.text
        ?.flatMap((c) => c.paragraphs)
        .flatMap((p) => p.runs)
        .map((r) => r.text)
        .join(' ')
        .trim()

      if (shapeText) {
        parts.push(`[Shape with text]: ${shapeText}`)
      } else {
        parts.push(`[Shape]: ${element.shapeType}`)
      }
    } else if (element.type === 'image') {
      parts.push(`[Image]: ${element.width}x${element.height}px`)
    }
  }

  return parts.length > 0 ? parts.join('\n') : '[Empty slide]'
}

/**
 * Build the analysis prompt for a specific agent and slide
 */
export function buildAnalysisPrompt(
  agent: Agent,
  slideContent: string,
  sectionName: string,
  slideIndex: number,
  totalSlides: number
): string {
  return `${agent.basePrompt}

You are analyzing slide ${slideIndex + 1} of ${totalSlides} in the "${sectionName}" section.

SLIDE CONTENT:
${slideContent}

Analyze this slide and provide feedback. Respond ONLY with valid JSON in this exact format:
{
  "comments": [
    {
      "severity": "info|warning|error|suggestion",
      "category": "string describing the category",
      "title": "short title for the comment",
      "description": "detailed description of the issue or observation",
      "suggestion": "optional actionable suggestion to improve"
    }
  ]
}

Rules:
- severity must be one of: "info", "warning", "error", "suggestion"
- Only include relevant, actionable feedback
- If nothing notable, return {"comments": []}
- Do not include any text outside the JSON object`
}

/**
 * Call OpenAI API for analysis
 */
async function analyzeWithOpenAI(
  prompt: string,
  apiKey: string,
  signal: AbortSignal
): Promise<PartialComment[]> {
  console.log('[OpenAI] Starting API call...')
  console.log('[OpenAI] Prompt length:', prompt.length)

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-nano-2025-08-07',
      input: prompt,
    }),
    signal,
  })

  console.log('[OpenAI] Response status:', response.status)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error('[OpenAI] API error:', error)
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('[OpenAI] Raw response data:', JSON.stringify(data, null, 2))

  const content = data.output_text || '{}'
  console.log('[OpenAI] Extracted content:', content)

  const comments = parseAnalysisResponse(content)
  console.log('[OpenAI] Parsed comments:', comments.length)

  return comments
}

/**
 * Call Anthropic API for analysis
 */
async function analyzeWithAnthropic(
  prompt: string,
  apiKey: string,
  signal: AbortSignal
): Promise<PartialComment[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || '{}'

  return parseAnalysisResponse(content)
}

/**
 * Parse AI response into structured comments
 */
function parseAnalysisResponse(content: string): PartialComment[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('No JSON found in response:', content)
      return []
    }

    const parsed = JSON.parse(jsonMatch[0])
    const comments = parsed.comments || []

    return comments.map((c: any) => ({
      severity: ['info', 'warning', 'error', 'suggestion'].includes(c.severity)
        ? c.severity
        : 'info',
      category: c.category || 'General',
      title: c.title || 'Untitled',
      description: c.description || '',
      suggestion: c.suggestion,
    }))
  } catch (error) {
    console.error('Failed to parse AI response:', error, content)
    return []
  }
}

// =============================================================================
// Scoring Analysis Functions
// =============================================================================

/**
 * Build the scoring prompt for numerical evaluation
 */
export function buildScoringPrompt(
  agent: Agent,
  metrics: EvaluationMetric[],
  slideContent: string,
  sectionName: string,
  slideIndex: number,
  totalSlides: number,
  previousSlideContext: string | null,
  previousScore: number | null
): string {
  const metricsDescription = metrics
    .map((m) => `- ${m.name} (weight: ${(m.weight * 100).toFixed(0)}%): ${m.lens}`)
    .join('\n')

  const contextSection = previousSlideContext
    ? `\nPREVIOUS SLIDE CONTEXT:\n${previousSlideContext}\n${previousScore !== null ? `Previous slide weighted score: ${previousScore.toFixed(1)}/7` : ''}`
    : ''

  return `${agent.basePrompt}

You are analyzing slide ${slideIndex + 1} of ${totalSlides} in the "${sectionName}" section.
${contextSection}
SLIDE CONTENT:
${slideContent}

EVALUATION METRICS:
${metricsDescription}

SCORING SCALE (1-7 Likert):
1 = Very Poor - Critical issues, fails to meet basic standards
2 = Poor - Significant problems affecting effectiveness
3 = Below Average - Notable issues needing improvement
4 = Average - Meets basic expectations, room for improvement
5 = Good - Above average, minor improvements possible
6 = Very Good - High quality with minimal issues
7 = Excellent - Exceptional, exemplary work

Analyze this slide and provide both numerical scores and qualitative feedback.

Respond ONLY with valid JSON in this exact format:
{
  "metrics": [
    {
      "metricId": "metric-id-here",
      "metricName": "Metric Name",
      "score": 5,
      "reasoning": "Evidence-based explanation for the score...",
      "contentAnchors": ["specific quote or element from slide", "another reference"]
    }
  ],
  "slideSummary": "Brief 1-2 sentence summary of this slide's content for context",
  "comments": [
    {
      "severity": "info|warning|error|suggestion",
      "category": "category string",
      "title": "short title",
      "description": "detailed description",
      "suggestion": "optional improvement suggestion"
    }
  ]
}

Rules:
- Provide a score (1-7) for each metric listed above
- Include specific contentAnchors from the slide content to support each score
- Keep slideSummary concise (1-2 sentences) for context building
- Comments should provide actionable feedback beyond the numerical scores
- If nothing notable for comments, return empty comments array`
}

// =============================================================================
// Section-Level Scoring Functions (New)
// =============================================================================

/**
 * Extract content from all slides in a section with slide markers
 */
export function extractSectionContent(
  slides: { slide: Slide; index: number }[]
): string {
  const parts: string[] = []

  for (const { slide, index } of slides) {
    parts.push(`=== SLIDE ${index + 1} ===`)
    parts.push(extractSlideContent(slide))
    parts.push('')
  }

  return parts.join('\n')
}

/**
 * Build the scoring prompt for section-level evaluation
 */
export function buildSectionScoringPrompt(
  agent: Agent,
  metrics: EvaluationMetric[],
  sectionContent: string,
  sectionName: string,
  sectionIndex: number,
  totalSections: number,
  slideCount: number
): string {
  const metricsDescription = metrics
    .map((m) => `- ID: "${m.id}" | Name: "${m.name}" (weight: ${(m.weight * 100).toFixed(0)}%): ${m.lens}`)
    .join('\n')

  return `${agent.basePrompt}

You are analyzing the entire "${sectionName}" section (Section ${sectionIndex + 1} of ${totalSections}), which contains ${slideCount} slide${slideCount > 1 ? 's' : ''}.

SECTION CONTENT:
${sectionContent}

EVALUATION METRICS:
${metricsDescription}

SCORING SCALE (1-7 Likert):
1 = Very Poor - Critical issues, fails to meet basic standards
2 = Poor - Significant problems affecting effectiveness
3 = Below Average - Notable issues needing improvement
4 = Average - Meets basic expectations, room for improvement
5 = Good - Above average, minor improvements possible
6 = Very Good - High quality with minimal issues
7 = Excellent - Exceptional, exemplary work

Analyze this ENTIRE SECTION as a unit and provide:
1. Overall section scores for each metric (evaluating the section as a whole)
2. A section summary
3. Per-slide comments where specific issues exist

Respond ONLY with valid JSON in this exact format:
{
  "metrics": [
    {
      "metricId": "USE_EXACT_ID_FROM_ABOVE",
      "metricName": "Metric Name",
      "score": 5,
      "reasoning": "Evidence-based explanation for the overall section score...",
      "contentAnchors": ["specific quotes or elements from the section content"]
    }
  ],
  "sectionSummary": "Overall assessment of this section as a cohesive unit (2-3 sentences)",
  "slideComments": [
    {
      "slideIndex": 0,
      "comments": [
        {
          "severity": "info|warning|error|suggestion",
          "category": "category string",
          "title": "short title",
          "description": "detailed description",
          "suggestion": "optional improvement suggestion"
        }
      ]
    }
  ]
}

Rules:
- IMPORTANT: Use the EXACT metricId provided above (e.g., "content-quality", "clarity", "engagement")
- Provide a score (1-7) for each metric, evaluating the ENTIRE section holistically
- Consider how well the slides work together as a coherent section
- contentAnchors should reference specific content from any slide in the section
- For slideComments, only include slides that have actionable feedback
- slideIndex is 0-based relative to the section (first slide in section = 0)
- If a slide has no issues, omit it from slideComments entirely`
}

// Parsed section scoring response structure
interface SectionScoringResponse {
  metrics: MetricScore[]
  sectionSummary: string
  slideComments: {
    slideIndex: number
    comments: PartialComment[]
  }[]
}

/**
 * Parse AI response for section-level scoring
 */
function parseSectionScoringResponse(
  content: string,
  expectedMetrics: EvaluationMetric[]
): SectionScoringResponse {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[parseSectionScoringResponse] No JSON found:', content.substring(0, 200))
      return { metrics: [], sectionSummary: '', slideComments: [] }
    }

    const parsed = JSON.parse(jsonMatch[0])
    console.log('[parseSectionScoringResponse] Parsed JSON:', JSON.stringify(parsed, null, 2).substring(0, 500))

    // Parse metrics and normalize IDs to match expected metrics
    const metrics: MetricScore[] = (parsed.metrics || []).map((m: any) => {
      const rawId = m.metricId || ''
      const rawName = m.metricName || ''

      // Try to match by exact ID first, then by name similarity
      let matchedMetric = expectedMetrics.find((em) => em.id === rawId)
      if (!matchedMetric) {
        // Fallback: match by name (case-insensitive, partial match)
        matchedMetric = expectedMetrics.find((em) =>
          em.name.toLowerCase().includes(rawName.toLowerCase().split(' ')[0]) ||
          rawName.toLowerCase().includes(em.name.toLowerCase().split(' ')[0])
        )
      }

      const normalizedScore = {
        metricId: matchedMetric?.id || rawId,
        metricName: matchedMetric?.name || rawName,
        score: Math.min(7, Math.max(1, Number(m.score) || 4)),
        reasoning: m.reasoning || '',
        contentAnchors: Array.isArray(m.contentAnchors) ? m.contentAnchors : [],
      }
      console.log(`[parseSectionScoringResponse] Metric: "${rawId}" (${rawName}) -> "${normalizedScore.metricId}" score=${normalizedScore.score}`)
      return normalizedScore
    })

    // Fill in missing metrics with default scores
    for (const expected of expectedMetrics) {
      if (!metrics.find((m) => m.metricId === expected.id)) {
        metrics.push({
          metricId: expected.id,
          metricName: expected.name,
          score: 4,
          reasoning: 'Score not provided by analysis',
          contentAnchors: [],
        })
      }
    }

    const slideComments = (parsed.slideComments || []).map((sc: any) => ({
      slideIndex: Number(sc.slideIndex) || 0,
      comments: (sc.comments || []).map((c: any) => ({
        severity: ['info', 'warning', 'error', 'suggestion'].includes(c.severity)
          ? c.severity
          : 'info',
        category: c.category || 'General',
        title: c.title || 'Untitled',
        description: c.description || '',
        suggestion: c.suggestion,
      })),
    }))

    return {
      metrics,
      sectionSummary: parsed.sectionSummary || '',
      slideComments,
    }
  } catch (error) {
    console.error('Failed to parse section scoring response:', error, content.substring(0, 500))
    return { metrics: [], sectionSummary: '', slideComments: [] }
  }
}

/**
 * Analyze an entire section with a single agent
 */
async function analyzeSectionWithScoring(
  slides: { slide: Slide; index: number }[],
  sectionId: string,
  sectionName: string,
  sectionIndex: number,
  totalSections: number,
  agent: Agent,
  metrics: EvaluationMetric[],
  apiConfig: APIKeyConfig,
  signal: AbortSignal
): Promise<{
  evaluation: AgentSectionEvaluation
  comments: AnalysisComment[]
}> {
  const sectionContent = extractSectionContent(slides)
  const prompt = buildSectionScoringPrompt(
    agent,
    metrics,
    sectionContent,
    sectionName,
    sectionIndex,
    totalSections,
    slides.length
  )

  let rawContent: string

  if (apiConfig.provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        input: prompt,
      }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[analyzeSectionWithScoring] OpenAI raw response keys:', Object.keys(data))
    console.log('[analyzeSectionWithScoring] OpenAI full response:', JSON.stringify(data).substring(0, 1000))

    // Try multiple extraction paths for OpenAI response
    rawContent = extractOpenAIContent(data)
    console.log('[analyzeSectionWithScoring] Extracted rawContent length:', rawContent.length)
    console.log('[analyzeSectionWithScoring] rawContent preview:', rawContent.substring(0, 500))
  } else {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiConfig.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    rawContent = data.content?.[0]?.text || '{}'
  }

  const parsed = parseSectionScoringResponse(rawContent, metrics)
  console.log('[analyzeSectionWithScoring] Parsed metrics count:', parsed.metrics.length)
  console.log('[analyzeSectionWithScoring] Parsed metrics:', parsed.metrics.map(m => `${m.metricId}=${m.score}`).join(', '))
  console.log('[analyzeSectionWithScoring] Parsed slideComments count:', parsed.slideComments.length)
  console.log('[analyzeSectionWithScoring] Parsed sectionSummary:', parsed.sectionSummary?.substring(0, 100))

  const weightedTotal = calculateWeightedScore(parsed.metrics, metrics)
  console.log('[analyzeSectionWithScoring] Weighted total:', weightedTotal)

  const evaluation: AgentSectionEvaluation = {
    agentId: agent.id,
    agentName: agent.name,
    sectionId,
    metricScores: parsed.metrics,
    weightedTotal,
    sectionSummary: parsed.sectionSummary,
  }

  // Map slide comments to AnalysisComment objects
  const comments: AnalysisComment[] = []
  console.log('[analyzeSectionWithScoring] Slides in section:', slides.map(s => `idx=${s.index}, id=${s.slide.id}`).join(', '))

  for (const slideComment of parsed.slideComments) {
    console.log('[analyzeSectionWithScoring] Processing slideComment for slideIndex:', slideComment.slideIndex, 'with', slideComment.comments.length, 'comments')
    const slideData = slides[slideComment.slideIndex]
    if (!slideData) {
      console.warn('[analyzeSectionWithScoring] No slide found at index', slideComment.slideIndex)
      continue
    }
    console.log('[analyzeSectionWithScoring] Mapping to slide:', slideData.slide.id)

    for (const c of slideComment.comments) {
      comments.push({
        ...c,
        id: generateId(),
        agentId: agent.id,
        agentName: agent.name,
        slideId: slideData.slide.id,
        sectionId,
        resolved: false,
        createdAt: new Date(),
      })
    }
  }

  console.log('[analyzeSectionWithScoring] Total comments created:', comments.length)

  return { evaluation, comments }
}

/**
 * Calculate weighted total score from metric scores
 */
function calculateWeightedScore(
  metricScores: MetricScore[],
  metrics: EvaluationMetric[]
): number {
  let totalScore = 0
  let totalWeight = 0

  for (const metricScore of metricScores) {
    const metric = metrics.find((m) => m.id === metricScore.metricId)
    if (metric) {
      totalScore += metricScore.score * metric.weight
      totalWeight += metric.weight
    }
  }

  return totalWeight > 0 ? totalScore / totalWeight * (totalWeight) : 0
}

/**
 * Run full scored analysis on a presentation (Per-Section Evaluation)
 *
 * New loop structure: sections → agents (one API call per section per agent)
 * This produces section-level scores where each agent evaluates an entire section as a unit.
 */
export async function runScoredAnalysis(
  presentation: Presentation,
  sections: Section[],
  agents: Agent[],
  agentMetricsMap: Record<string, EvaluationMetric[]>,
  apiConfig: APIKeyConfig,
  onProgress: (progress: AnalysisProgress) => void,
  signal: AbortSignal
): Promise<ScoredAnalysisResult> {
  const totalSlides = presentation.slides.length
  const totalAgents = agents.length
  let processedSteps = 0
  // New: totalSteps = sections × agents (not sections × slides × agents)
  const totalSteps = sections.length * totalAgents

  const sectionAnalyses: SectionAnalysis[] = []
  const sectionEvaluationResults: SectionEvaluationResult[] = []

  // Sort sections by afterSlideIndex
  const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)

  for (let sectionIndex = 0; sectionIndex < sortedSections.length; sectionIndex++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    const section = sortedSections[sectionIndex]
    const slidesInSection = getSlidesInSection(sectionIndex, sortedSections, presentation.slides)

    // Collect all agent evaluations and comments for this section
    const agentEvaluations: AgentSectionEvaluation[] = []
    const allSectionComments: AnalysisComment[] = []

    for (const agent of agents) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

      onProgress({
        currentStep: `Evaluating "${section.name}" with ${agent.name}...`,
        currentSlideIndex: slidesInSection[0]?.index || 0,
        currentAgentId: agent.id,
        totalSlides,
        totalAgents,
        percentComplete: Math.round((processedSteps / totalSteps) * 100),
      })

      const metrics = agentMetricsMap[agent.id] || []

      try {
        const { evaluation, comments } = await analyzeSectionWithScoring(
          slidesInSection,
          section.id,
          section.name,
          sectionIndex,
          sortedSections.length,
          agent,
          metrics,
          apiConfig,
          signal
        )

        agentEvaluations.push(evaluation)
        allSectionComments.push(...comments)
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw error
        console.error(`Error evaluating section "${section.name}" with ${agent.name}:`, error)
      }

      processedSteps++
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Calculate average score across all agents for this section
    const averageScore =
      agentEvaluations.length > 0
        ? agentEvaluations.reduce((sum, e) => sum + e.weightedTotal, 0) / agentEvaluations.length
        : 0

    // Create SectionEvaluationResult
    const sectionEvalResult: SectionEvaluationResult = {
      sectionId: section.id,
      sectionName: section.name,
      sectionIndex,
      agentEvaluations,
      averageScore,
    }
    sectionEvaluationResults.push(sectionEvalResult)

    // Build slide analyses from comments (group by slideId)
    const slideAnalyses: SlideAnalysis[] = slidesInSection.map(({ slide, index }) => ({
      slideId: slide.id,
      slideIndex: index,
      comments: allSectionComments.filter((c) => c.slideId === slide.id),
    }))

    // Build section analysis (for backwards compatibility)
    const sectionAnalysis: SectionAnalysis = {
      sectionId: section.id,
      sectionName: section.name,
      summary: agentEvaluations[0]?.sectionSummary || '',
      slides: slideAnalyses,
      commentCount: {
        total: 0,
        byAgent: {},
        bySeverity: {},
      },
    }

    // Count comments
    for (const slide of slideAnalyses) {
      for (const comment of slide.comments) {
        sectionAnalysis.commentCount.total++
        sectionAnalysis.commentCount.byAgent[comment.agentName] =
          (sectionAnalysis.commentCount.byAgent[comment.agentName] || 0) + 1
        sectionAnalysis.commentCount.bySeverity[comment.severity] =
          (sectionAnalysis.commentCount.bySeverity[comment.severity] || 0) + 1
      }
    }

    if (!sectionAnalysis.summary) {
      sectionAnalysis.summary = generateSectionSummary(sectionAnalysis)
    }
    sectionAnalyses.push(sectionAnalysis)
  }

  // Calculate overall score (average of all section averages)
  const overallScore =
    sectionEvaluationResults.length > 0
      ? sectionEvaluationResults.reduce((sum, s) => sum + s.averageScore, 0) / sectionEvaluationResults.length
      : 0

  // Build legacy slideEvaluations and sectionScores for backwards compatibility
  const allSlideEvaluations: SlideEvaluation[] = []
  const sectionScores: SectionScores[] = []

  for (let i = 0; i < sectionEvaluationResults.length; i++) {
    const sectionEval = sectionEvaluationResults[i]
    const slidesInSection = getSlidesInSection(i, sortedSections, presentation.slides)

    // Legacy section scores
    sectionScores.push({
      sectionId: sectionEval.sectionId,
      averageScore: sectionEval.averageScore,
      metricAverages: aggregateAgentMetricAverages(sectionEval.agentEvaluations),
      lowestSlideIndex: slidesInSection[0]?.index || 0,
    })

    // Create placeholder slide evaluations (using section average)
    for (const { slide, index } of slidesInSection) {
      allSlideEvaluations.push({
        slideId: slide.id,
        slideIndex: index,
        metricScores: [],
        weightedTotal: sectionEval.averageScore,
        slideSummary: '',
      })
    }
  }

  const totalComments = sectionAnalyses.reduce((sum, s) => s.commentCount.total + sum, 0)
  const overallSummary =
    totalComments === 0
      ? `Analysis complete. Overall score: ${overallScore.toFixed(1)}/7`
      : `Analysis complete. Found ${totalComments} item${totalComments > 1 ? 's' : ''} for review. Overall score: ${overallScore.toFixed(1)}/7`

  return {
    id: generateId(),
    presentationId: presentation.id,
    sections: sectionAnalyses,
    overallSummary,
    analyzedAt: new Date(),
    agentsUsed: agents.map((a) => a.id),
    isComplete: true,
    slideEvaluations: allSlideEvaluations,
    sectionScores,
    overallScore,
    sectionEvaluations: sectionEvaluationResults,
  }
}

/**
 * Aggregate metric averages across multiple agent evaluations
 */
function aggregateAgentMetricAverages(
  agentEvaluations: AgentSectionEvaluation[]
): Record<string, number> {
  const metricTotals: Record<string, { sum: number; count: number }> = {}

  for (const evaluation of agentEvaluations) {
    for (const score of evaluation.metricScores) {
      if (!metricTotals[score.metricId]) {
        metricTotals[score.metricId] = { sum: 0, count: 0 }
      }
      metricTotals[score.metricId].sum += score.score
      metricTotals[score.metricId].count++
    }
  }

  const averages: Record<string, number> = {}
  for (const [metricId, { sum, count }] of Object.entries(metricTotals)) {
    averages[metricId] = count > 0 ? sum / count : 0
  }

  return averages
}

/**
 * Run analysis for a single slide with a single agent
 */
async function analyzeSlide(
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  sectionId: string,
  sectionName: string,
  agent: Agent,
  apiConfig: APIKeyConfig,
  signal: AbortSignal
): Promise<AnalysisComment[]> {
  const slideContent = extractSlideContent(slide)
  const prompt = buildAnalysisPrompt(agent, slideContent, sectionName, slideIndex, totalSlides)

  let rawComments: PartialComment[]

  if (apiConfig.provider === 'openai') {
    rawComments = await analyzeWithOpenAI(prompt, apiConfig.apiKey, signal)
  } else {
    rawComments = await analyzeWithAnthropic(prompt, apiConfig.apiKey, signal)
  }

  // Add metadata to comments
  return rawComments.map((c) => ({
    ...c,
    id: generateId(),
    agentId: agent.id,
    agentName: agent.name,
    slideId: slide.id,
    sectionId,
    resolved: false,
    createdAt: new Date(),
  }))
}

/**
 * Generate a summary for a section based on its comments
 */
function generateSectionSummary(section: SectionAnalysis): string {
  const totalComments = section.slides.reduce((sum, s) => sum + s.comments.length, 0)

  if (totalComments === 0) {
    return 'No significant issues found in this section.'
  }

  const bySeverity: Record<string, number> = {}
  const byAgent: Record<string, number> = {}

  for (const slide of section.slides) {
    for (const comment of slide.comments) {
      bySeverity[comment.severity] = (bySeverity[comment.severity] || 0) + 1
      byAgent[comment.agentName] = (byAgent[comment.agentName] || 0) + 1
    }
  }

  const parts: string[] = []

  if (bySeverity.error) {
    parts.push(`${bySeverity.error} error${bySeverity.error > 1 ? 's' : ''} found`)
  }
  if (bySeverity.warning) {
    parts.push(`${bySeverity.warning} warning${bySeverity.warning > 1 ? 's' : ''}`)
  }
  if (bySeverity.suggestion) {
    parts.push(`${bySeverity.suggestion} suggestion${bySeverity.suggestion > 1 ? 's' : ''}`)
  }

  return parts.length > 0 ? parts.join(', ') + '.' : 'Review complete with informational notes.'
}

/**
 * Get slides belonging to a section
 */
function getSlidesInSection(
  sectionIndex: number,
  sections: Section[],
  slides: Slide[]
): { slide: Slide; index: number }[] {
  const section = sections[sectionIndex]
  const nextSection = sections[sectionIndex + 1]

  const startIndex = section.afterSlideIndex + 1
  const endIndex = nextSection ? nextSection.afterSlideIndex : slides.length - 1

  const result: { slide: Slide; index: number }[] = []
  for (let i = startIndex; i <= endIndex && i < slides.length; i++) {
    result.push({ slide: slides[i], index: i })
  }

  return result
}

/**
 * Run full analysis on a presentation
 */
export async function runFullAnalysis(
  presentation: Presentation,
  sections: Section[],
  agents: Agent[],
  apiConfig: APIKeyConfig,
  onProgress: (progress: AnalysisProgress) => void,
  signal: AbortSignal
): Promise<AnalysisResult> {
  const totalSlides = presentation.slides.length
  const totalAgents = agents.length
  let processedSteps = 0
  const totalSteps = sections.length * totalSlides * totalAgents

  const sectionAnalyses: SectionAnalysis[] = []

  // Sort sections by afterSlideIndex
  const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)

  for (let sectionIndex = 0; sectionIndex < sortedSections.length; sectionIndex++) {
    const section = sortedSections[sectionIndex]
    const slidesInSection = getSlidesInSection(sectionIndex, sortedSections, presentation.slides)

    const slideAnalyses: SlideAnalysis[] = []

    for (const { slide, index: slideIndex } of slidesInSection) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

      const slideComments: AnalysisComment[] = []

      for (const agent of agents) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

        onProgress({
          currentStep: `Analyzing slide ${slideIndex + 1} with ${agent.name}...`,
          currentSlideIndex: slideIndex,
          currentAgentId: agent.id,
          totalSlides,
          totalAgents,
          percentComplete: Math.round((processedSteps / totalSteps) * 100),
        })

        try {
          const comments = await analyzeSlide(
            slide,
            slideIndex,
            totalSlides,
            section.id,
            section.name,
            agent,
            apiConfig,
            signal
          )
          slideComments.push(...comments)
        } catch (error) {
          if ((error as Error).name === 'AbortError') throw error
          console.error(`Error analyzing slide ${slideIndex + 1} with ${agent.name}:`, error)
          // Continue with other agents/slides even if one fails
        }

        processedSteps++

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      slideAnalyses.push({
        slideId: slide.id,
        slideIndex,
        comments: slideComments,
      })
    }

    const sectionAnalysis: SectionAnalysis = {
      sectionId: section.id,
      sectionName: section.name,
      summary: '',
      slides: slideAnalyses,
      commentCount: {
        total: 0,
        byAgent: {},
        bySeverity: {},
      },
    }

    // Calculate comment counts
    for (const slide of slideAnalyses) {
      for (const comment of slide.comments) {
        sectionAnalysis.commentCount.total++
        sectionAnalysis.commentCount.byAgent[comment.agentName] =
          (sectionAnalysis.commentCount.byAgent[comment.agentName] || 0) + 1
        sectionAnalysis.commentCount.bySeverity[comment.severity] =
          (sectionAnalysis.commentCount.bySeverity[comment.severity] || 0) + 1
      }
    }

    sectionAnalysis.summary = generateSectionSummary(sectionAnalysis)
    sectionAnalyses.push(sectionAnalysis)
  }

  // Generate overall summary
  const totalComments = sectionAnalyses.reduce((sum, s) => s.commentCount.total + sum, 0)
  const overallSummary = totalComments === 0
    ? 'No significant issues found. Your presentation looks good!'
    : `Analysis complete. Found ${totalComments} item${totalComments > 1 ? 's' : ''} for review.`

  return {
    id: generateId(),
    presentationId: presentation.id,
    sections: sectionAnalyses,
    overallSummary,
    analyzedAt: new Date(),
    agentsUsed: agents.map((a) => a.id),
    isComplete: true,
  }
}
