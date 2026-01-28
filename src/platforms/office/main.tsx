import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlatformProvider } from '@core/platform'
import { createOfficeAdapter } from './adapters/officeAdapter'
import { OfficeApp } from './App'
import '../../index.css'

// Office Add-in initialization
Office.onReady((info) => {
  if (info.host === Office.HostType.PowerPoint) {
    const officeAdapter = createOfficeAdapter()

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <PlatformProvider adapter={officeAdapter}>
          <OfficeApp />
        </PlatformProvider>
      </StrictMode>,
    )
  } else {
    // Show error if not running in PowerPoint
    document.getElementById('root')!.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>Unsupported Host</h2>
        <p>This add-in is designed to run in PowerPoint.</p>
        <p>Current host: ${info.host || 'Unknown'}</p>
      </div>
    `
  }
})
