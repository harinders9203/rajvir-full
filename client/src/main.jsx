import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { SiteDataProvider } from './hooks/useSiteData.js';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SiteDataProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SiteDataProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
