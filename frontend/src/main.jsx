import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
// Fonts are bundled with the app (no Google Fonts request), so Bangla text
// renders even on slow or flaky connections.
import '@fontsource/anek-bangla/500.css'
import '@fontsource/anek-bangla/600.css'
import '@fontsource/anek-bangla/700.css'
import '@fontsource/anek-bangla/800.css'
import '@fontsource/hind-siliguri/400.css'
import '@fontsource/hind-siliguri/500.css'
import '@fontsource/hind-siliguri/600.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
