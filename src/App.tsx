import { useModeStore, usePresentationStore } from '@/stores'
import { Editor } from '@/components/editor/Editor'
import { WelcomeScreen } from '@/components/editor/WelcomeScreen'
import { PreparationMode } from '@/components/preparation/PreparationMode'
import { AnalysisMode } from '@/components/analysis/AnalysisMode'

function App() {
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

export default App
