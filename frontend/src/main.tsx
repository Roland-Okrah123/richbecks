import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('RICHBECKS is ready to work offline.');
  },
  onNeedRefresh() {
    console.log('A new RICHBECKS version is available.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);