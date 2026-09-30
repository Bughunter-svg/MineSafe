// ===== Shared UI Components =====

import React from 'react';
import { RiskLevel } from '@/types';
import { RISK_COLORS } from '@/data/mineData';
import { AlertTriangle, CheckCircle, XCircle, Info, Clock, Zap } from 'lucide-react';

// ===== Simulation Mode Banner =====
export const SimBanner: React.FC = () => (
  <div className="sim-banner flex items-center justify-center gap-2">
    <AlertTriangle size={12} />
    <span>⚠ SIMULATION MODE — NOT CONNECTED TO PHYSICAL SENSORS — ALL DATA IS SIMULATED</span>
    <AlertTriangle size={12} />
  </div>
);

// ===== Risk Badge =====
export const RiskBadge: React.FC<{ level: RiskLevel; className?: string }> = ({ level, className = '' }) => {
  const cls = {
    Normal: 'risk-normal',
    Low: 'risk-low',
    Moderate: 'risk-moderate',
    High: 'risk-high',
    Critical: 'risk-critical',
  }[level];
  return <span className={`risk-badge ${cls} ${className}`}>{level}</span>;
};

// ===== Metric Card =====
export const MetricCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
  subtext?: string;
}> = ({ icon, value, label, color = '#3b82f6', subtext }) => (
  <div className="metric-card">
    <div className="flex items-start justify-between">
      <div>
        <div className="metric-value" style={{ color }}>{value}</div>
        <div className="metric-label">{label}</div>
        {subtext && <div className="text-xs text-mine-muted mt-1">{subtext}</div>}
      </div>
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
  </div>
);

// ===== Status Dot =====
export const StatusDot: React.FC<{ online: boolean; pulse?: boolean }> = ({ online, pulse = false }) => (
  <span className={`status-dot ${online ? 'bg-mine-success' : 'bg-mine-danger'} ${pulse && online ? 'animate-pulse' : ''}`} />
);

// ===== Progress Bar =====
export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  height?: number;
}> = ({ value, max = 100, color = '#3b82f6', showLabel = true, height = 6 }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-mine-surface rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && <span className="text-xs text-mine-muted font-mono w-10 text-right">{Math.round(pct)}%</span>}
    </div>
  );
};

// ===== Empty State =====
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-mine-muted mb-4">{icon || <Info size={48} />}</div>
    <h3 className="text-lg font-semibold text-mine-text mb-2">{title}</h3>
    <p className="text-mine-muted text-sm max-w-md mb-4">{description}</p>
    {action}
  </div>
);

// ===== Loading Spinner =====
export const Spinner: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div className="flex items-center justify-center">
    <div
      className="border-2 border-mine-border border-t-mine-accent rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  </div>
);

// ===== Tooltip Wrapper =====
export const Tooltip: React.FC<{
  text: string;
  children: React.ReactNode;
}> = ({ text, children }) => (
  <div className="relative group inline-flex">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-mine-card border border-mine-border rounded text-xs text-mine-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      {text}
    </div>
  </div>
);

// ===== Chart Tooltip =====
export const CustomChartTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}> = ({ active, payload, label, formatter }) => {
  if (!active || !payload) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-xs text-mine-muted mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-mono" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value, entry.name) : entry.value?.toFixed(3)}
        </p>
      ))}
    </div>
  );
};

// ===== Demo Step Indicator =====
export const DemoStepIndicator: React.FC<{ step: number; totalSteps?: number }> = ({ step, totalSteps = 7 }) => {
  const steps = [
    { label: 'Healthy', icon: <CheckCircle size={14} /> },
    { label: 'Event', icon: <Zap size={14} /> },
    { label: 'Sensors', icon: <Info size={14} /> },
    { label: 'GARC', icon: <Info size={14} /> },
    { label: 'Escalate', icon: <AlertTriangle size={14} /> },
    { label: 'Alert', icon: <AlertTriangle size={14} /> },
    { label: 'Summary', icon: <CheckCircle size={14} /> },
  ];
  
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
              i + 1 <= step
                ? 'bg-mine-accent/20 text-mine-accent'
                : 'bg-mine-surface text-mine-muted'
            } ${i + 1 === step ? 'ring-1 ring-mine-accent' : ''}`}
          >
            {s.icon}
            <span className="hidden md:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-4 h-px ${i + 1 < step ? 'bg-mine-accent' : 'bg-mine-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ===== Format Helpers =====
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function riskColor(level: RiskLevel): string {
  return RISK_COLORS[level];
}

export function batteryColor(pct: number): string {
  if (pct > 50) return '#22c55e';
  if (pct > 20) return '#f59e0b';
  return '#ef4444';
}

export function signalColor(dbm: number): string {
  if (dbm > -70) return '#22c55e';
  if (dbm > -90) return '#f59e0b';
  return '#ef4444';
}
