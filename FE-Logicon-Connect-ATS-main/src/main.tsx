import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupApiInterceptors } from '@/api/setupInterceptors'
import { AppProviders } from '@/app/providers'
import { App } from '@/App'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import '@/styles/index.css'

applyTheme(getStoredTheme())
setupApiInterceptors()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)



