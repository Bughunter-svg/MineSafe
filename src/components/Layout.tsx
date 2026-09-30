// ===== Main Layout with Sidebar Navigation =====

import React, { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { DemoStepIndicator, formatElapsed } from '@/components/shared';
import {
  LayoutDashboard, Activity, Box, Brain, TrendingUp,
  Bell, HeartPulse, Settings, Play, Pause, RotateCcw,
  Zap, Radio, ChevronLeft, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/monitoring', label: 'Live Monitoring', icon: Activity },
  { path: '/digital-twin', label: 'Digital Twin', icon: Box },
  { path: '/garc', label: 'GARC Analysis', icon: Brain },
  { path: '/prediction', label: 'Prediction', icon: TrendingUp },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/health', label: 'System Health', icon: HeartPulse },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Layout: React.FC = () => {
  const location = useLocation();
  const { simulation, alerts, tick, pauseSimulation, resumeSimulation, resetSimulation, runDemo } = useAppStore();
  const tickRef = useRef<number | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);

  const unackAlerts = alerts.filter(a => !a.acknowledged).length;

  // Simulation tick loop
  useEffect(() => {
    if (simulation.running && !simulation.paused) {
      tickRef.current = window.setInterval(() => {
        tick();
      }, 1000 / simulation.speed);
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [simulation.running, simulation.paused, simulation.speed, tick]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Demo Step Progress (when in demo mode) */}
      {simulation.demoMode && (
        <div className="bg-mine-surface border-b border-mine-border px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-mine-accent font-semibold">🎬 GUIDED DEMO</span>
          <DemoStepIndicator step={simulation.demoStep} />
          <span className="text-xs font-mono text-mine-muted">{formatElapsed(simulation.elapsedSeconds)}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-mine-surface border-r border-mine-border flex flex-col transition-all duration-200 flex-shrink-0`}>
          {/* Logo */}
          <div className="px-4 py-4 border-b border-mine-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                M
              </div>
              {!collapsed && (
                <div>
                  <h1 className="text-sm font-bold text-mine-text leading-none">MineSafe AI</h1>
                  <p className="text-[10px] text-mine-muted leading-none mt-0.5">Digital Twin Simulator</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isAlerts = item.path === '/alerts';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
                  }
                >
                  <div className="relative">
                    <Icon size={18} />
                    {isAlerts && unackAlerts > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-mine-danger rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                        {unackAlerts > 9 ? '9+' : unackAlerts}
                      </span>
                    )}
                  </div>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Simulation Quick Controls */}
          <div className="p-2 border-t border-mine-border space-y-2">
            {!simulation.running ? (
              <button
                onClick={runDemo}
                className="btn btn-primary w-full text-xs justify-center"
              >
                <Play size={14} />
                {!collapsed && 'Run Demo'}
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={simulation.paused ? resumeSimulation : pauseSimulation}
                  className="btn btn-ghost flex-1 text-xs justify-center"
                >
                  {simulation.paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button
                  onClick={resetSimulation}
                  className="btn btn-ghost flex-1 text-xs justify-center"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            )}

            {simulation.running && !collapsed && (
              <div className="text-center">
                <div className="text-xs font-mono text-mine-accent">{formatElapsed(simulation.elapsedSeconds)}</div>
                <div className="text-[10px] text-mine-muted">{simulation.speed}x speed</div>
              </div>
            )}
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 border-t border-mine-border text-mine-muted hover:text-mine-text transition-colors"
          >
            {collapsed ? <ChevronRight size={16} className="mx-auto" /> : <ChevronLeft size={16} className="mx-auto" />}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-mine-bg">
          <Outlet />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-mine-surface border-t border-mine-border px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Radio size={12} className={simulation.running ? 'text-mine-success animate-pulse' : 'text-mine-muted'} />
            <span className="text-mine-muted">
              {simulation.running ? (simulation.paused ? 'Paused' : 'Running') : 'Idle'}
            </span>
          </div>
          {simulation.scenarioId && (
            <span className="text-mine-muted">
              Scenario: <span className="text-mine-text">{simulation.scenarioId}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-mine-muted font-mono">
            Sim Time: {new Date(simulation.currentTime).toLocaleTimeString()}
          </span>
          <span className="text-mine-muted">
            MineSafe AI v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
};

export default Layout;
