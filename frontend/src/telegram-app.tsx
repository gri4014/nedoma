import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { GlobalStyles } from './styles/globalStyles';
import ThemeProvider from './providers/ThemeProvider';
import { initTelegram } from './utils/telegram';

// Initialize Telegram WebApp as early as possible
initTelegram();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <GlobalStyles />
      <Router>
        <App />
      </Router>
    </ThemeProvider>
  </React.StrictMode>
);
