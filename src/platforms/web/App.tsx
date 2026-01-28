import { useModeStore, usePresentationStore } from '@core/stores'
import { Editor } from '@/components/editor/Editor'
import { WelcomeScreen } from '@platforms/web/components/WelcomeScreen'
import { PreparationMode } from '@/components/preparation/PreparationMode'
import { AnalysisMode } from '@/components/analysis/AnalysisMode'

export function WebApp() {
  const { currentMode } = useModeStore()
  const { presentation } = usePresentationStore()

  // If no presentation is loaded, show welcome screen
  if (!presentation) {
    return <WelcomeScreen />
  }

  // Route based on current mode
  switch (currentMode) {
    case 'preparation':
      return <PreparationMode />
    case 'analysis':
      return <AnalysisMode />
    case 'edit':
    default:
      return <Editor />
  }
}
