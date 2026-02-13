import './app.css'
import './monaco-setup'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const root = document.getElementById('root')!
createRoot(root).render(<App />)
