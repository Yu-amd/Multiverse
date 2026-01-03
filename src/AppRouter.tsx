import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ThemeInitializer } from './components/ThemeInitializer';
import { FleetPage } from './pages/FleetPage';
import { RunsPage } from './pages/RunsPage';
import { ModelsPage } from './pages/ModelsPage';
import { ObservabilityPage } from './pages/ObservabilityPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppWithChat } from './AppWithChat';
import './App.css'; // Import App.css to ensure theme variables are loaded
import './AppRouter.css';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeInitializer />
      <div className="app-router">
        <Navigation />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/fleet" replace />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/tasks" element={<AppWithChat />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/observability" element={<ObservabilityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

