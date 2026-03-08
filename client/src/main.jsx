import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import VPSalesView from './VPSalesView';
import './index.css';

const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
const isVPSales = pathname.includes('vp-sales');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isVPSales ? <VPSalesView /> : <App />}
  </React.StrictMode>
);
