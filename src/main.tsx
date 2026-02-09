import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'

// Register chart components (side-effect import — SaaS content pack)
import './components/charts/index.ts'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
