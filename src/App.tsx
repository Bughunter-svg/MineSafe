// ===== Main App Component =====

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Spinner } from '@/components/shared';

// Lazy-load pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const LiveMonitoring = lazy(() => import('@/pages/LiveMonitoring'));
const DigitalTwin = lazy(() => import('@/pages/DigitalTwin'));
const GARCExplainability = lazy(() => import('@/pages/GARCExplainability'));
const Prediction = lazy(() => import('@/pages/Prediction'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const SystemHealth = lazy(() => import('@/pages/SystemHealth'));
const Settings = lazy(() => import('@/pages/Settings'));

const Loading: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <Spinner size={40} />
      <p className="text-mine-muted text-sm mt-4">Loading module...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monitoring" element={<LiveMonitoring />} />
            <Route path="/digital-twin" element={<DigitalTwin />} />
            <Route path="/garc" element={<GARCExplainability />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/health" element={<SystemHealth />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
