import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { EventosProvider } from './context/EventosContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EventosProvider>
        <App />
      </EventosProvider>
    </AuthProvider>
  </StrictMode>,
)
