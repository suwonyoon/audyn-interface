import { useState } from 'react'
import { useAgentsStore } from '@core/stores'
import type { Agent } from '@core/types'
import {
  Palette,
  FileText,
  Eye,
  GitBranch,
  Sparkles,
  Plus,
  X,
  Check,
  Key,
  ChevronDown,
  Sliders,
} from 'lucide-react'
import { MetricConfigPanel } from './MetricConfigPanel'

const iconMap: Record<string, React.ElementType> = {
  Palette,
  FileText,
  Eye,
  GitBranch,
  Sparkles,
}

export function AgentSelectionPanel() {
  const {
    presetAgents,
    customAgents,
    enabledAgentIds,
    apiKeyConfig,
    toggleAgent,
    createCustomAgent,
    deleteCustomAgent,
    setAPIKey,
    clearAPIKey,
    getAgentMetrics,
  } = useAgentsStore()

  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [apiKey, setApiKey] = useState(apiKeyConfig?.apiKey || '')
  const [provider, setProvider] = useState<'openai' | 'anthropic'>(
    apiKeyConfig?.provider || 'openai'
  )
  const [configuringAgentId, setConfiguringAgentId] = useState<string | null>(null)

  const handleCreateCustomAgent = () => {
    if (customName.trim() && customPrompt.trim()) {
      const agent = createCustomAgent(customName.trim(), customPrompt.trim())
      toggleAgent(agent.id) // Enable it by default
      setCustomName('')
      setCustomPrompt('')
      setShowCustomForm(false)
    }
  }

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setAPIKey({ provider, apiKey: apiKey.trim() })
    } else {
      clearAPIKey()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 tp:p-6">
      <div>
        {/* Preset Agents */}
        <div className="mb-6 tp:mb-8">
          <h2 className="text-sm tp:text-lg font-semibold text-gray-900 mb-1 tp:mb-2">Analysis Agents</h2>
          <p className="text-xs tp:text-sm text-gray-500 mb-3 tp:mb-4">
            Select the AI agents that will analyze your presentation.
          </p>

          <div className="grid grid-cols-1 tp:grid-cols-2 gap-3 tp:gap-4">
            {presetAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isEnabled={enabledAgentIds.includes(agent.id)}
                metricsCount={getAgentMetrics(agent.id).length}
                onToggle={() => toggleAgent(agent.id)}
                onConfigureMetrics={() => setConfiguringAgentId(agent.id)}
              />
            ))}
          </div>
        </div>

        {/* Custom Agents */}
        <div className="mb-6 tp:mb-8">
          <h3 className="text-xs tp:text-sm font-semibold text-gray-700 mb-3 tp:mb-4">Custom Agents</h3>

          {customAgents.length > 0 && (
            <div className="space-y-2 tp:space-y-3 mb-3 tp:mb-4">
              {customAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-3 tp:p-4 rounded-lg border transition-colors ${
                    enabledAgentIds.includes(agent.id)
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 tp:gap-3 min-w-0">
                      <button
                        onClick={() => toggleAgent(agent.id)}
                        className={`w-4 h-4 tp:w-5 tp:h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                          enabledAgentIds.includes(agent.id)
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {enabledAgentIds.includes(agent.id) && (
                          <Check className="w-2.5 h-2.5 tp:w-3 tp:h-3 text-white" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <h4 className="text-xs tp:text-sm font-medium text-gray-900 truncate">{agent.name}</h4>
                        <p className="text-xs text-gray-500 truncate hidden tp:block">
                          {agent.basePrompt.substring(0, 60)}...
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCustomAgent(agent.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCustomForm ? (
            <div className="p-3 tp:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-3 tp:space-y-4">
                <div>
                  <label className="block text-xs tp:text-sm font-medium text-gray-700 mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., Brand Consistency"
                    className="w-full px-2.5 tp:px-3 py-1.5 tp:py-2 border rounded-lg text-xs tp:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs tp:text-sm font-medium text-gray-700 mb-1">
                    Base Prompt
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe what this agent should analyze and how..."
                    rows={3}
                    className="w-full px-2.5 tp:px-3 py-1.5 tp:py-2 border rounded-lg text-xs tp:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col tp:flex-row justify-end gap-2">
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomAgent}
                    disabled={!customName.trim() || !customPrompt.trim()}
                    className="w-full tp:w-auto px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Agent
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomForm(true)}
              className="w-full tp:w-auto flex items-center justify-center gap-2 px-3 tp:px-4 py-1.5 tp:py-2 border border-dashed border-gray-300 rounded-lg text-xs tp:text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
              Create Custom Agent
            </button>
          )}
        </div>

        {/* API Configuration */}
        <div className="border-t pt-4 tp:pt-6">
          <div className="flex items-center gap-2 mb-3 tp:mb-4">
            <Key className="w-3.5 h-3.5 tp:w-4 tp:h-4 text-gray-500" />
            <h3 className="text-xs tp:text-sm font-semibold text-gray-700">API Configuration</h3>
          </div>

          <div className="p-3 tp:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col gap-2 tp:gap-3">
              <div className="relative">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
                  className="w-full appearance-none px-3 tp:px-4 py-1.5 tp:py-2 pr-8 border rounded-lg text-xs tp:text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 tp:w-4 tp:h-4 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                className="w-full px-3 tp:px-4 py-1.5 tp:py-2 border rounded-lg text-xs tp:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="w-full tp:w-auto px-3 tp:px-4 py-1.5 tp:py-2 bg-gray-800 text-white text-xs tp:text-sm rounded-lg hover:bg-gray-900"
              >
                Save
              </button>
            </div>
            {apiKeyConfig && (
              <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                API key saved for {apiKeyConfig.provider}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Configuration Modal */}
      {configuringAgentId && (
        <MetricConfigPanel
          agentId={configuringAgentId}
          agentName={
            [...presetAgents, ...customAgents].find((a) => a.id === configuringAgentId)?.name ||
            'Agent'
          }
          onClose={() => setConfiguringAgentId(null)}
        />
      )}
    </div>
  )
}

interface AgentCardProps {
  agent: Agent
  isEnabled: boolean
  metricsCount?: number
  onToggle: () => void
  onConfigureMetrics?: () => void
}

function AgentCard({ agent, isEnabled, metricsCount, onToggle, onConfigureMetrics }: AgentCardProps) {
  const Icon = iconMap[agent.icon || 'Sparkles'] || Sparkles

  return (
    <div
      className={`p-3 tp:p-4 rounded-lg border transition-all ${
        isEnabled
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between mb-1.5 tp:mb-2">
          <div
            className={`p-1.5 tp:p-2 rounded-lg ${
              isEnabled ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <Icon
              className={`w-4 h-4 tp:w-5 tp:h-5 ${isEnabled ? 'text-blue-600' : 'text-gray-500'}`}
            />
          </div>
          <div
            className={`w-4 h-4 tp:w-5 tp:h-5 rounded border-2 flex items-center justify-center ${
              isEnabled
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300'
            }`}
          >
            {isEnabled && <Check className="w-2.5 h-2.5 tp:w-3 tp:h-3 text-white" />}
          </div>
        </div>
        <h3
          className={`text-xs tp:text-sm font-medium mb-0.5 tp:mb-1 ${
            isEnabled ? 'text-blue-900' : 'text-gray-900'
          }`}
        >
          {agent.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2">{agent.description}</p>
      </button>

      {/* Configure Metrics button */}
      {isEnabled && onConfigureMetrics && (
        <div className="mt-2 tp:mt-3 pt-2 tp:pt-3 border-t border-blue-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfigureMetrics()
            }}
            className="flex items-center gap-1.5 tp:gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Sliders className="w-3 h-3 tp:w-3.5 tp:h-3.5" />
            <span className="hidden tp:inline">Configure Metrics</span>
            <span className="tp:hidden">Metrics</span>
            {metricsCount !== undefined && (
              <span className="px-1 tp:px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                {metricsCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
