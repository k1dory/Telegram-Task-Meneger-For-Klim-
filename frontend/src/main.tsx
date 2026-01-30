import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Prevent context menu on long press (mobile)
document.addEventListener('contextmenu', (e) => {
  if (window.Telegram?.WebApp) {
    e.preventDefault();
  }
});

// Handle viewport changes
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

setViewportHeight();
window.addEventListener('resize', setViewportHeight);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
