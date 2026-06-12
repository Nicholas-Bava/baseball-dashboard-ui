// src/main.jsx
// Application entry point. This file mounts the React app into the HTML page.
// - StrictMode activates additional checks and warnings for development.
// - createRoot mounts the React component tree into the DOM element with id 'root'.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Find the DOM node and render the top-level <App /> inside <StrictMode>
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
