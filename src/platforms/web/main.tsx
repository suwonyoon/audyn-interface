import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlatformProvider } from '@core/platform'
import { createWebAdapter } from './adapters/webAdapter'
import { WebApp } from './App'
import '../../index.css'

const webAdapter = createWebAdapter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformProvider adapter={webAdapter}>
      <WebApp />
    </PlatformProvider>
  </StrictMode>,
)
