import './app.css'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { setupGlobalRendererDiagnostics } from './lib/diagnostics'

setupGlobalRendererDiagnostics('main-window')

const root = document.getElementById('root')!
createRoot(root).render(<App />)
