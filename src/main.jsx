import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/themes.css' // Import themes first
import './index.css'
import './i18n/config'; // Initialize i18n
import App from './App.jsx'

// ONE-TIME RESET: Clear all theme data and force light theme
const THEME_KEY = 'breachbuddy-theme';
const RESET_KEY = 'theme-reset-v2'; // Change this version to force reset again if needed

// Check if we need to reset
if (!localStorage.getItem(RESET_KEY)) {
  console.log('🔄 Performing one-time theme reset...');
  localStorage.removeItem(THEME_KEY);
  localStorage.setItem(THEME_KEY, 'light');
  localStorage.setItem(RESET_KEY, 'true');
}

// Always ensure light theme is default
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

console.log('🎨 Current theme:', savedTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
