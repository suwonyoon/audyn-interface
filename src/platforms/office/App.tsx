import { useModeStore, usePresentationStore } from '@core/stores'
import { TaskPaneHome } from './components/TaskPaneHome'
import { PreparationMode } from '@/components/preparation/PreparationMode'
import { AnalysisMode } from '@/components/analysis/AnalysisMode'

export function OfficeApp() {
  const { currentMode } = useModeStore()
  const { presentation } = usePresentationStore()

  // If no presentation is loaded, show task pane home
  if (!presentation) {
    return <TaskPaneHome />
  }

  // Route based on current mode (Office add-in only supports preparation and analysis)
  switch (currentMode) {
    case 'preparation':
      return <PreparationMode />
    case 'analysis':
      return <AnalysisMode />
    case 'edit':
      // Office add-in doesn't support edit mode - redirect to analysis
      // Users should edit directly in PowerPoint
      return <AnalysisMode />
    default:
      return <PreparationMode />
  }
}
