import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Agent, APIKeyConfig, EvaluationMetric } from '@core/types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// =============================================================================
// Preset Metrics Definitions
// =============================================================================

export const PRESET_METRICS: EvaluationMetric[] = [
  {
    id: 'content-quality',
    name: 'Content & Argument Quality',
    weight: 0.3,
    lens: 'Evaluate claims, evidence quality, and logical argumentation. Look for unsupported assertions and logical coherence.',
  },
  {
    id: 'clarity',
    name: 'Clarity & Comprehension',
    weight: 0.25,
    lens: 'Assess how clearly ideas are communicated. Consider terminology, explanation quality, and audience appropriateness.',
  },
  {
    id: 'visual-design',
    name: 'Visual Design',
    weight: 0.25,
    lens: 'Evaluate visual hierarchy, layout, whitespace, and typography effectiveness.',
  },
  {
    id: 'engagement',
    name: 'Engagement & Impact',
    weight: 0.2,
    lens: 'Assess memorability, emotional resonance, and call-to-action effectiveness.',
  },
]

// Default metrics per preset agent (tailored to each agent's focus)
export const DEFAULT_AGENT_METRICS: Record<string, EvaluationMetric[]> = {
  'design-review': [
    { ...PRESET_METRICS.find((m) => m.id === 'visual-design')!, weight: 0.5 },
    { ...PRESET_METRICS.find((m) => m.id === 'clarity')!, weight: 0.3 },
    { ...PRESET_METRICS.find((m) => m.id === 'engagement')!, weight: 0.2 },
  ],
  'content-quality': [
    { ...PRESET_METRICS.find((m) => m.id === 'content-quality')!, weight: 0.5 },
    { ...PRESET_METRICS.find((m) => m.id === 'clarity')!, weight: 0.3 },
    { ...PRESET_METRICS.find((m) => m.id === 'engagement')!, weight: 0.2 },
  ],
  accessibility: [
    { ...PRESET_METRICS.find((m) => m.id === 'clarity')!, weight: 0.4 },
    { ...PRESET_METRICS.find((m) => m.id === 'visual-design')!, weight: 0.4 },
    { ...PRESET_METRICS.find((m) => m.id === 'content-quality')!, weight: 0.2 },
  ],
  'presentation-flow': [
    { ...PRESET_METRICS.find((m) => m.id === 'engagement')!, weight: 0.4 },
    { ...PRESET_METRICS.find((m) => m.id === 'clarity')!, weight: 0.3 },
    { ...PRESET_METRICS.find((m) => m.id === 'content-quality')!, weight: 0.3 },
  ],
}

// Preset agent definitions
export const PRESET_AGENTS: Agent[] = [
  {
    id: 'design-review',
    name: 'Design Review',
    description: 'Analyzes visual consistency, layout, color choices, and typography',
    basePrompt: `You are an expert presentation designer. Analyze the slide content for:
- Visual consistency (colors, fonts, spacing)
- Layout effectiveness and balance
- Typography choices and readability
- Use of whitespace
- Overall visual hierarchy

Provide specific, actionable feedback to improve the visual design.`,
    isPreset: true,
    isEnabled: false,
    icon: 'Palette',
  },
  {
    id: 'content-quality',
    name: 'Content Quality',
    description: 'Reviews clarity, grammar, messaging effectiveness, and audience engagement',
    basePrompt: `You are an expert content strategist. Analyze the slide content for:
- Message clarity and conciseness
- Grammar and spelling errors
- Audience appropriateness
- Key message emphasis
- Call-to-action effectiveness

Provide specific suggestions to improve content quality and impact.`,
    isPreset: true,
    isEnabled: false,
    icon: 'FileText',
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    description: 'Checks contrast ratios, readability, and accessibility best practices',
    basePrompt: `You are an accessibility expert. Analyze the slide content for:
- Color contrast ratios (WCAG guidelines)
- Font size and readability
- Text alternatives for images
- Cognitive load considerations
- Screen reader compatibility

Provide specific recommendations to make the presentation more accessible.`,
    isPreset: true,
    isEnabled: false,
    icon: 'Eye',
  },
  {
    id: 'presentation-flow',
    name: 'Presentation Flow',
    description: 'Evaluates logical structure, transitions, and storytelling',
    basePrompt: `You are a presentation coach. Analyze the slide content for:
- Logical flow and structure
- Transition effectiveness between ideas
- Storytelling elements
- Opening and closing strength
- Audience engagement techniques

Provide specific feedback to improve the presentation's narrative flow.`,
    isPreset: true,
    isEnabled: false,
    icon: 'GitBranch',
  },
]

interface AgentsState {
  presetAgents: Agent[]
  customAgents: Agent[]
  enabledAgentIds: string[]
  apiKeyConfig: APIKeyConfig | null
  agentMetrics: Record<string, EvaluationMetric[]>

  // Agent toggle actions
  toggleAgent: (agentId: string) => void
  enableAgent: (agentId: string) => void
  disableAgent: (agentId: string) => void
  enableAllPresets: () => void
  disableAllAgents: () => void

  // Custom agent management
  createCustomAgent: (name: string, basePrompt: string, description?: string) => Agent
  updateCustomAgent: (agentId: string, updates: Partial<Agent>) => void
  deleteCustomAgent: (agentId: string) => void

  // API Key management
  setAPIKey: (config: APIKeyConfig) => void
  clearAPIKey: () => void
  hasValidAPIKey: () => boolean

  // Metrics management
  setAgentMetrics: (agentId: string, metrics: EvaluationMetric[]) => void
  updateMetricWeight: (agentId: string, metricId: string, weight: number) => void
  validateAgentMetrics: (agentId: string) => boolean
  normalizeMetricWeights: (agentId: string) => void

  // Queries
  getEnabledAgents: () => Agent[]
  getAgentById: (agentId: string) => Agent | null
  getAllAgents: () => Agent[]
  getAgentMetrics: (agentId: string) => EvaluationMetric[]
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      presetAgents: PRESET_AGENTS,
      customAgents: [],
      enabledAgentIds: [],
      apiKeyConfig: null,
      agentMetrics: { ...DEFAULT_AGENT_METRICS },

      toggleAgent: (agentId) => {
        const { enabledAgentIds } = get()
        if (enabledAgentIds.includes(agentId)) {
          set({ enabledAgentIds: enabledAgentIds.filter(id => id !== agentId) })
        } else {
          set({ enabledAgentIds: [...enabledAgentIds, agentId] })
        }
      },

      enableAgent: (agentId) => {
        const { enabledAgentIds } = get()
        if (!enabledAgentIds.includes(agentId)) {
          set({ enabledAgentIds: [...enabledAgentIds, agentId] })
        }
      },

      disableAgent: (agentId) => {
        set({ enabledAgentIds: get().enabledAgentIds.filter(id => id !== agentId) })
      },

      enableAllPresets: () => {
        const presetIds = PRESET_AGENTS.map(a => a.id)
        set({ enabledAgentIds: [...new Set([...get().enabledAgentIds, ...presetIds])] })
      },

      disableAllAgents: () => {
        set({ enabledAgentIds: [] })
      },

      createCustomAgent: (name, basePrompt, description) => {
        const newAgent: Agent = {
          id: `custom-${generateId()}`,
          name,
          description: description || `Custom agent: ${name}`,
          basePrompt,
          isPreset: false,
          isEnabled: false,
          icon: 'Sparkles',
        }

        // Initialize with default preset metrics for custom agents
        set({
          customAgents: [...get().customAgents, newAgent],
          agentMetrics: {
            ...get().agentMetrics,
            [newAgent.id]: [...PRESET_METRICS],
          },
        })
        return newAgent
      },

      updateCustomAgent: (agentId, updates) => {
        set({
          customAgents: get().customAgents.map(agent =>
            agent.id === agentId ? { ...agent, ...updates } : agent
          ),
        })
      },

      deleteCustomAgent: (agentId) => {
        const { agentMetrics } = get()
        const { [agentId]: _removed, ...remainingMetrics } = agentMetrics
        set({
          customAgents: get().customAgents.filter((a) => a.id !== agentId),
          enabledAgentIds: get().enabledAgentIds.filter((id) => id !== agentId),
          agentMetrics: remainingMetrics,
        })
      },

      setAPIKey: (config) => {
        set({ apiKeyConfig: config })
      },

      clearAPIKey: () => {
        set({ apiKeyConfig: null })
      },

      hasValidAPIKey: () => {
        const { apiKeyConfig } = get()
        return !!(apiKeyConfig?.apiKey && apiKeyConfig.apiKey.length > 10)
      },

      getEnabledAgents: () => {
        const { presetAgents, customAgents, enabledAgentIds } = get()
        const allAgents = [...presetAgents, ...customAgents]
        return allAgents.filter(agent => enabledAgentIds.includes(agent.id))
      },

      getAgentById: (agentId) => {
        const { presetAgents, customAgents } = get()
        return [...presetAgents, ...customAgents].find(a => a.id === agentId) || null
      },

      getAllAgents: () => {
        const { presetAgents, customAgents } = get()
        return [...presetAgents, ...customAgents]
      },

      // Metrics management
      setAgentMetrics: (agentId, metrics) => {
        set({
          agentMetrics: {
            ...get().agentMetrics,
            [agentId]: metrics,
          },
        })
      },

      updateMetricWeight: (agentId, metricId, weight) => {
        const { agentMetrics } = get()
        const metrics = agentMetrics[agentId] || []
        const updatedMetrics = metrics.map((m) =>
          m.id === metricId ? { ...m, weight } : m
        )
        set({
          agentMetrics: {
            ...agentMetrics,
            [agentId]: updatedMetrics,
          },
        })
      },

      validateAgentMetrics: (agentId) => {
        const { agentMetrics } = get()
        const metrics = agentMetrics[agentId]
        if (!metrics || metrics.length === 0) return false
        const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0)
        return Math.abs(totalWeight - 1.0) < 0.001
      },

      normalizeMetricWeights: (agentId) => {
        const { agentMetrics } = get()
        const metrics = agentMetrics[agentId]
        if (!metrics || metrics.length === 0) return

        const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0)
        if (totalWeight === 0) return

        const normalizedMetrics = metrics.map((m) => ({
          ...m,
          weight: m.weight / totalWeight,
        }))

        set({
          agentMetrics: {
            ...agentMetrics,
            [agentId]: normalizedMetrics,
          },
        })
      },

      getAgentMetrics: (agentId) => {
        const { agentMetrics } = get()
        // Return agent-specific metrics or default preset metrics
        return agentMetrics[agentId] || [...PRESET_METRICS]
      },
    }),
    {
      name: 'audyn-agents-storage',
      partialize: (state) => ({
        customAgents: state.customAgents,
        apiKeyConfig: state.apiKeyConfig,
        enabledAgentIds: state.enabledAgentIds,
        agentMetrics: state.agentMetrics,
      }),
    }
  )
)
