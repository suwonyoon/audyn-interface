import { useState } from 'react'
import { useAgentsStore } from '@/stores'
import type { Agent } from '@/types'
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl">
        {/* Preset Agents */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Analysis Agents</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select the AI agents that will analyze your presentation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Custom Agents</h3>

          {customAgents.length > 0 && (
            <div className="space-y-3 mb-4">
              {customAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    enabledAgentIds.includes(agent.id)
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAgent(agent.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          enabledAgentIds.includes(agent.id)
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {enabledAgentIds.includes(agent.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                      <div>
                        <h4 className="font-medium text-gray-900">{agent.name}</h4>
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {agent.basePrompt.substring(0, 60)}...
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCustomAgent(agent.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCustomForm ? (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., Brand Consistency"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Prompt
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe what this agent should analyze and how..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomAgent}
                    disabled={!customName.trim() || !customPrompt.trim()}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Agent
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomForm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Custom Agent
            </button>
          )}
        </div>

        {/* API Configuration */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">API Configuration</h3>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
                  className="appearance-none px-4 py-2 pr-8 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                className="flex-1 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900"
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
      className={`p-4 rounded-lg border transition-all ${
        isEnabled
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between mb-2">
          <div
            className={`p-2 rounded-lg ${
              isEnabled ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <Icon
              className={`w-5 h-5 ${isEnabled ? 'text-blue-600' : 'text-gray-500'}`}
            />
          </div>
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              isEnabled
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300'
            }`}
          >
            {isEnabled && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
        <h3
          className={`font-medium mb-1 ${
            isEnabled ? 'text-blue-900' : 'text-gray-900'
          }`}
        >
          {agent.name}
        </h3>
        <p className="text-sm text-gray-500">{agent.description}</p>
      </button>

      {/* Configure Metrics button */}
      {isEnabled && onConfigureMetrics && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfigureMetrics()
            }}
            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Sliders className="w-3.5 h-3.5" />
            Configure Metrics
            {metricsCount !== undefined && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {metricsCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
