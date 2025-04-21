import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@mui/material/styles'
import { aroihubTheme } from './theme/mui-theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={aroihubTheme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
