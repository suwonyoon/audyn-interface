import { useModeStore } from '@core/stores'
import { ArrowLeft, FileUp } from 'lucide-react'

export function WelcomeScreen() {
  const { goToPreparation } = useModeStore()

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md px-6">
        <FileUp className="w-16 h-16 text-gray-300 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Presentation Loaded</h2>
        <p className="text-gray-600 mb-6">
          Please upload a presentation to start editing.
        </p>
        <button
          onClick={goToPreparation}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Go to Setup
        </button>
      </div>
    </div>
  )
}
