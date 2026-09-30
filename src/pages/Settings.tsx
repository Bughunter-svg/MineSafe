import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SCENARIOS, DEFAULT_THRESHOLDS, MINE_CONFIG } from '@/data/mineData';
import { ThresholdConfig } from '@/types';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  AlertTriangle, 
  Save, 
  RefreshCw, 
  Info, 
  Settings as SettingsIcon,
  Activity,
  PlayCircle,
  Database
} from 'lucide-react';

const Settings: React.FC = () => {
  const {
    simulation,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    setSpeed,
    setSeed,
    updateThresholds,
    thresholds,
    runDemo
  } = useAppStore();

  const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);
  const [localThresholds, setLocalThresholds] = useState<ThresholdConfig>(thresholds);
  const [localSeed, setLocalSeed] = useState(simulation.seed || 12345);

  useEffect(() => {
    const saved = localStorage.getItem('minesafe-thresholds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        updateThresholds(parsed);
        setLocalThresholds(parsed);
      } catch (e) {
        console.error('Failed to parse thresholds', e);
      }
    }
  }, [updateThresholds]);

  useEffect(() => {
    setLocalThresholds(thresholds);
  }, [thresholds]);

  useEffect(() => {
    setLocalSeed(simulation.seed);
  }, [simulation.seed]);

  const handleApplyThresholds = () => {
    updateThresholds(localThresholds);
    localStorage.setItem('minesafe-thresholds', JSON.stringify(localThresholds));
  };

  const handleResetThresholds = () => {
    setLocalThresholds(DEFAULT_THRESHOLDS);
    updateThresholds(DEFAULT_THRESHOLDS);
    localStorage.removeItem('minesafe-thresholds');
  };

  const handleThresholdChange = (key: keyof ThresholdConfig, value: number) => {
    setLocalThresholds(prev => ({ ...prev, [key]: value }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedScenario = SCENARIOS.find(s => s.id === selectedScenarioId);

  let statusText = 'IDLE';
  let statusColor = 'text-mine-muted';
  if (simulation.running) {
    if (simulation.paused) {
      statusText = 'PAUSED';
      statusColor = 'text-mine-warning';
    } else {
      statusText = 'RUNNING';
      statusColor = 'text-mine-success';
    }
  }

  const ThresholdInput = ({ 
    label, 
    value, 
    onChange, 
    step = "0.1", 
    min = "0", 
    max = "100" 
  }: { 
    label: string, 
    value: number, 
    onChange: (v: number) => void, 
    step?: string, 
    min?: string,
    max?: string 
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-mine-muted uppercase tracking-wider font-semibold">{label}</label>
      <input 
        type="number" 
        step={step} 
        min={min} 
        max={max}
        value={value} 
        onChange={e => onChange(Number(e.target.value))} 
        className="bg-mine-bg border border-mine-border text-mine-text rounded px-3 py-2 focus:border-mine-accent outline-none transition-colors w-full font-mono text-sm" 
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-mine-bg text-mine-text">


      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* SIMULATION CONTROLS */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-mine-card border border-mine-border rounded-xl p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6 border-b border-mine-border pb-4">
              <SettingsIcon className="text-mine-accent h-5 w-5" />
              <h2 className="text-lg font-bold">Simulation Controls</h2>
            </div>
            
            <div className="flex-1 space-y-6">
              {/* Scenario Selection */}
              <div className="space-y-3">
                <label className="text-sm text-mine-muted uppercase tracking-wider font-semibold">Scenario</label>
                <select 
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full bg-mine-surface border border-mine-border text-mine-text rounded px-3 py-2 outline-none focus:border-mine-accent"
                  disabled={simulation.running}
                >
                  {SCENARIOS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {selectedScenario && (
                  <p className="text-sm text-mine-muted bg-mine-surface/50 p-3 rounded border border-mine-border">
                    {selectedScenario.description}
                  </p>
                )}
              </div>

              {/* Status & Time */}
              <div className="grid grid-cols-2 gap-4 bg-mine-surface p-4 rounded-lg border border-mine-border">
                <div className="flex flex-col">
                  <span className="text-mine-muted text-xs uppercase font-semibold">Status</span>
                  <span className={`font-bold text-lg ${statusColor}`}>{statusText}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-mine-muted text-xs uppercase font-semibold">Elapsed Time</span>
                  <span className="font-mono text-xl">{formatTime(simulation.elapsedSeconds || 0)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                {simulation.running ? (
                  simulation.paused ? (
                    <button onClick={resumeSimulation} className="flex items-center justify-center gap-2 bg-mine-success hover:bg-green-600 text-white rounded py-2 transition-colors font-semibold">
                      <Play className="h-4 w-4" /> Resume
                    </button>
                  ) : (
                    <button onClick={pauseSimulation} className="flex items-center justify-center gap-2 bg-mine-warning hover:bg-yellow-600 text-white rounded py-2 transition-colors font-semibold">
                      <Pause className="h-4 w-4" /> Pause
                    </button>
                  )
                ) : (
                  <button onClick={() => startSimulation(selectedScenarioId)} className="flex items-center justify-center gap-2 bg-mine-success hover:bg-green-600 text-white rounded py-2 transition-colors font-semibold">
                    <Play className="h-4 w-4" /> Start
                  </button>
                )}
                <button onClick={resetSimulation} className="flex items-center justify-center gap-2 bg-mine-surface border border-mine-border hover:bg-mine-border text-white rounded py-2 transition-colors font-semibold">
                  <Square className="h-4 w-4" /> Reset
                </button>
              </div>

              {/* Speed & Seed */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-mine-muted uppercase tracking-wider font-semibold">Speed</label>
                  <div className="flex gap-1">
                    {[1, 2, 5, 10].map(s => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`flex-1 py-1 text-sm rounded border transition-colors ${simulation.speed === s ? 'bg-mine-accent border-mine-accent text-white font-bold' : 'bg-mine-surface border-mine-border hover:bg-mine-border text-mine-muted'}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-mine-muted uppercase tracking-wider font-semibold">Random Seed</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={localSeed} 
                      onChange={e => setLocalSeed(Number(e.target.value))} 
                      onBlur={() => setSeed(localSeed)} 
                      className="bg-mine-surface border border-mine-border text-mine-text rounded px-3 py-1 w-full font-mono text-sm outline-none focus:border-mine-accent" 
                      disabled={simulation.running}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={runDemo} 
              className="mt-6 flex items-center justify-center gap-2 w-full bg-gradient-to-r from-mine-accent to-purple-600 hover:from-blue-500 hover:to-purple-500 py-3 rounded-lg font-bold shadow-lg shadow-mine-accent/20 transition-all text-white"
            >
              <PlayCircle className="h-5 w-5" /> Run Demo Scenario
            </button>
          </div>
        </div>

        {/* RISK THRESHOLDS & SYSTEM INFO */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* RISK THRESHOLDS */}
          <div className="bg-mine-card border border-mine-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-mine-border pb-4">
              <div className="flex items-center gap-2">
                <Activity className="text-mine-warning h-5 w-5" />
                <h2 className="text-lg font-bold">Risk Thresholds</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleResetThresholds} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-mine-surface border border-mine-border hover:bg-mine-border rounded transition-colors text-mine-text"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <button 
                  onClick={handleApplyThresholds} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-mine-accent hover:bg-blue-600 rounded transition-colors text-white font-semibold shadow-lg shadow-mine-accent/20"
                >
                  <Save className="h-4 w-4" /> Apply Changes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Residuals Group */}
              <div className="bg-mine-surface/50 border border-mine-border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-mine-accent flex items-center gap-2 border-b border-mine-border/50 pb-2">
                  GARC Algorithm
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <ThresholdInput label="Res. Warn (mm)" step="0.5" value={localThresholds.residualWarning} onChange={v => handleThresholdChange('residualWarning', v)} />
                  <ThresholdInput label="Res. Crit (mm)" step="0.5" value={localThresholds.residualCritical} onChange={v => handleThresholdChange('residualCritical', v)} />
                  <ThresholdInput label="Neighbour Min" step="0.1" max="1" value={localThresholds.neighbourAgreementMin} onChange={v => handleThresholdChange('neighbourAgreementMin', v)} />
                  <ThresholdInput label="Persist Steps" step="1" value={localThresholds.persistenceSteps} onChange={v => handleThresholdChange('persistenceSteps', v)} />
                </div>
              </div>

              {/* Geo-Structural Group */}
              <div className="bg-mine-surface/50 border border-mine-border rounded-lg p-4 space-y-4 lg:col-span-2">
                <h3 className="text-sm font-bold text-mine-info flex items-center gap-2 border-b border-mine-border/50 pb-2">
                  Physical Parameters
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <ThresholdInput label="Tilt Warn (°)" step="0.1" value={localThresholds.tiltWarning} onChange={v => handleThresholdChange('tiltWarning', v)} />
                  <ThresholdInput label="Tilt Crit (°)" step="0.1" value={localThresholds.tiltCritical} onChange={v => handleThresholdChange('tiltCritical', v)} />
                  <ThresholdInput label="Disp Warn (mm)" step="0.5" value={localThresholds.displacementWarning} onChange={v => handleThresholdChange('displacementWarning', v)} />
                  <ThresholdInput label="Disp Crit (mm)" step="0.5" value={localThresholds.displacementCritical} onChange={v => handleThresholdChange('displacementCritical', v)} />
                  <ThresholdInput label="Vib Warn (mm/s)" step="0.1" value={localThresholds.vibrationWarning} onChange={v => handleThresholdChange('vibrationWarning', v)} />
                  <ThresholdInput label="Vib Crit (mm/s)" step="0.1" value={localThresholds.vibrationCritical} onChange={v => handleThresholdChange('vibrationCritical', v)} />
                  <ThresholdInput label="Crack Warn (mm)" step="0.1" value={localThresholds.crackWarning} onChange={v => handleThresholdChange('crackWarning', v)} />
                  <ThresholdInput label="Crack Crit (mm)" step="0.1" value={localThresholds.crackCritical} onChange={v => handleThresholdChange('crackCritical', v)} />
                </div>
              </div>

              {/* Node Health Group */}
              <div className="bg-mine-surface/50 border border-mine-border rounded-lg p-4 space-y-4 md:col-span-2 lg:col-span-3">
                <h3 className="text-sm font-bold text-mine-success flex items-center gap-2 border-b border-mine-border/50 pb-2">
                  Node Health
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ThresholdInput label="Battery Warn (%)" step="5" max="100" value={localThresholds.batteryWarning} onChange={v => handleThresholdChange('batteryWarning', v)} />
                  <ThresholdInput label="Signal Warn (dBm)" step="5" max="0" min="-120" value={localThresholds.signalWarning} onChange={v => handleThresholdChange('signalWarning', v)} />
                </div>
              </div>
            </div>
          </div>

          {/* SYSTEM INFO */}
          <div className="bg-mine-card border border-mine-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-mine-border pb-4">
              <Info className="text-mine-info h-5 w-5" />
              <h2 className="text-lg font-bold">System Info</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-mine-muted mb-3 text-xs uppercase tracking-wider font-semibold">Mine Configuration</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between p-2.5 bg-mine-surface border border-mine-border rounded">
                    <span className="text-mine-muted">Panel Dimensions</span> 
                    <span className="font-mono">{MINE_CONFIG.panelWidth}m × {MINE_CONFIG.panelLength}m</span>
                  </li>
                  <li className="flex justify-between p-2.5 bg-mine-surface border border-mine-border rounded">
                    <span className="text-mine-muted">Extraction Depth</span> 
                    <span className="font-mono">{MINE_CONFIG.extractionDepth}m</span>
                  </li>
                  <li className="flex justify-between p-2.5 bg-mine-surface border border-mine-border rounded">
                    <span className="text-mine-muted">Extraction Ratio</span> 
                    <span className="font-mono">{(MINE_CONFIG.extractionRatio * 100).toFixed(0)}%</span>
                  </li>
                  <li className="flex justify-between p-2.5 bg-mine-surface border border-mine-border rounded">
                    <span className="text-mine-muted">Subsidence Angle</span> 
                    <span className="font-mono">{MINE_CONFIG.subsidenceAngle}°</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-mine-muted mb-3 text-xs uppercase tracking-wider font-semibold">Application Details</h3>
                <div className="bg-mine-surface p-5 rounded-lg border border-mine-border space-y-5 text-sm h-[calc(100%-1.75rem)]">
                  <div>
                    <span className="block text-mine-muted text-xs uppercase tracking-wider mb-1">Software Version</span>
                    <div className="flex items-center gap-2 text-mine-accent font-semibold">
                      <Database className="h-4 w-4" />
                      MineSafe AI v1.0.0 — Digital Twin Simulator
                    </div>
                  </div>
                  <div>
                    <span className="block text-mine-muted text-xs uppercase tracking-wider mb-1">Data Persistence</span>
                    <span className="text-mine-text/80">Settings stored in browser localStorage. Simulation data is ephemeral and will reset on page reload.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
