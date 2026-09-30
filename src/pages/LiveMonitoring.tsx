import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Battery,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Signal,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RISK_COLORS, SCENARIOS } from '@/data/mineData';
import {
  buildTimelineAnnotations,
  CrackWidthChart,
  DisplacementChart,
  GARCResidualChart,
  NodeSelector,
  TiltChart,
  TimeRange,
  TimeRangeSelector,
  VibrationChart,
} from '@/components/DeformationCharts';

const LiveMonitoring: React.FC = () => {
  const {
    nodes,
    zones,
    selectedNodeId,
    selectNode,
    garcHistory,
    thresholds,
    simulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
  } = useAppStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('5m');
  const [comparedNodeIds, setComparedNodeIds] = useState<string[]>([]);

  const focusedNode = useMemo(
    () => nodes.find(node => node.id === selectedNodeId) ?? nodes[0],
    [nodes, selectedNodeId],
  );
  const nodeZone = useMemo(
    () => focusedNode ? zones.find(zone => zone.id === focusedNode.zoneId) ?? null : null,
    [focusedNode, zones],
  );
  const scenarioEvents = useMemo(
    () => SCENARIOS.find(scenario => scenario.id === simulation.scenarioId)?.events ?? [],
    [simulation.scenarioId],
  );

  // Keep the focused node in the comparison by default, while retaining a user’s
  // explicit multi-node selection as new readings arrive.
  useEffect(() => {
    if (!focusedNode) {
      setComparedNodeIds([]);
      return;
    }
    setComparedNodeIds(previous => {
      const valid = previous.filter(id => nodes.some(node => node.id === id));
      if (valid.length === previous.length && valid.includes(focusedNode.id)) return previous;
      return [focusedNode.id, ...valid].slice(0, 4);
    });
  }, [focusedNode, nodes]);

  const comparisonIds = comparedNodeIds.length > 0
    ? comparedNodeIds
    : focusedNode ? [focusedNode.id] : [];

  const selectFocusedNode = (nodeId: string) => {
    selectNode(nodeId);
    setComparedNodeIds(previous => previous.includes(nodeId)
      ? previous
      : [nodeId, ...previous].slice(0, 4));
  };

  const toggleComparisonNode = (nodeId: string) => {
    if (comparedNodeIds.includes(nodeId)) {
      const next = comparedNodeIds.filter(id => id !== nodeId);
      setComparedNodeIds(next);
      if (focusedNode?.id === nodeId) selectNode(next[0] ?? null);
      return;
    }
    if (comparedNodeIds.length < 4) setComparedNodeIds([...comparedNodeIds, nodeId]);
  };

  const makeAnnotations = (nodeIds: string[], metric: 'displacement' | 'tilt' | 'vibration' | 'crackWidth' | 'residual') => buildTimelineAnnotations({
    nodes,
    nodeIds,
    garcHistory,
    scenarioEvents,
    simulationStartTime: simulation.startTime,
    currentTime: simulation.currentTime,
    thresholds,
    metric,
  });

  const displacementAnnotations = useMemo(
    () => makeAnnotations(comparisonIds, 'displacement'),
    [nodes, comparisonIds, garcHistory, scenarioEvents, simulation.startTime, simulation.currentTime, thresholds],
  );
  const tiltAnnotations = useMemo(
    () => focusedNode ? makeAnnotations([focusedNode.id], 'tilt') : [],
    [nodes, focusedNode, garcHistory, scenarioEvents, simulation.startTime, simulation.currentTime, thresholds],
  );
  const vibrationAnnotations = useMemo(
    () => focusedNode ? makeAnnotations([focusedNode.id], 'vibration') : [],
    [nodes, focusedNode, garcHistory, scenarioEvents, simulation.startTime, simulation.currentTime, thresholds],
  );
  const crackAnnotations = useMemo(
    () => focusedNode ? makeAnnotations([focusedNode.id], 'crackWidth') : [],
    [nodes, focusedNode, garcHistory, scenarioEvents, simulation.startTime, simulation.currentTime, thresholds],
  );
  const residualAnnotations = useMemo(
    () => focusedNode ? makeAnnotations([focusedNode.id], 'residual') : [],
    [nodes, focusedNode, garcHistory, scenarioEvents, simulation.startTime, simulation.currentTime, thresholds],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0f1419] text-gray-200">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-[#1e2a3a] bg-[#1a2332]">
          <div className="border-b border-[#1e2a3a] p-4">
            <div className="font-semibold">Sensor Nodes</div>
            <div className="mt-1 text-xs text-slate-500">Choose a node for detailed telemetry</div>
          </div>
          <div className="h-full overflow-y-auto p-2 pb-24">
            {nodes.map(node => {
              const zone = zones.find(item => item.id === node.zoneId);
              const riskColor = RISK_COLORS[zone?.riskLevel ?? 'Normal'];
              const isSelected = node.id === focusedNode?.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectFocusedNode(node.id)}
                  className={`mb-2 flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${isSelected ? 'border-slate-500 bg-[#1e2a3a]' : 'border-transparent hover:bg-[#1e2a3a]'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${node.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium">{node.name}</span>
                  </span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: riskColor }} />
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {focusedNode ? (
            <div className="mx-auto flex max-w-7xl flex-col gap-5">
              <section className="flex flex-col gap-4 rounded-xl border border-[#1e2a3a] bg-[#1a2332] p-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{focusedNode.name}</h2>
                    <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${focusedNode.online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                      {focusedNode.online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span>Sensor ID: <span className="font-mono text-slate-300">{focusedNode.id}</span></span>
                    <span>Zone: {nodeZone?.name ?? focusedNode.zoneId}</span>
                    <span>Depth: {focusedNode.depth} m</span>
                    {focusedNode.hasFault && <span className="text-red-300">{focusedNode.faultType}</span>}
                  </div>
                </div>
                <div className="flex gap-5 text-center">
                  <StatusMetric icon={<Battery size={21} className="text-emerald-400" />} value={`${focusedNode.currentReading.battery}%`} label="Battery" />
                  <StatusMetric icon={<Signal size={21} className="text-sky-400" />} value={`${focusedNode.currentReading.signalStrength} dBm`} label="Signal" />
                  <StatusMetric icon={<Radio size={21} className={simulation.running && !simulation.paused ? 'text-emerald-400' : 'text-slate-500'} />} value={simulation.paused ? 'Paused' : simulation.running ? 'Live' : 'Idle'} label="Simulation" />
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricBox label="Tilt" value={`${focusedNode.currentReading.tilt.toFixed(2)}°`} icon={<Activity />} />
                <MetricBox label="Vibration" value={`${focusedNode.currentReading.vibration.toFixed(2)} mm/s`} icon={<Zap />} />
                <MetricBox label="Displacement" value={`${focusedNode.currentReading.displacement.toFixed(2)} mm`} icon={<Thermometer />} />
                <MetricBox label="Crack Width" value={`${focusedNode.currentReading.crackWidth.toFixed(2)} mm`} icon={<AlertTriangle />} />
              </section>

              <section className="rounded-xl border border-[#1e2a3a] bg-[#1a2332] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-sm font-semibold text-slate-200">Compare displacement sensors <span className="font-normal text-slate-500">(up to four)</span></div>
                    <NodeSelector nodes={nodes} selectedIds={comparisonIds} onToggle={toggleComparisonNode} maxSelections={4} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TimeRangeSelector range={timeRange} onRangeChange={setTimeRange} />
                    {simulation.running && <button type="button" onClick={simulation.paused ? resumeSimulation : pauseSimulation} className="flex items-center gap-1.5 rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700">
                      {simulation.paused ? <Play size={14} /> : <Pause size={14} />}{simulation.paused ? 'Resume' : 'Pause'}
                    </button>}
                    <button type="button" onClick={resetSimulation} className="flex items-center gap-1.5 rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700">
                      <RotateCcw size={14} />Reset simulation
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">Charts retain the latest 900 readings per sensor. Pausing stops incoming simulation readings; reset clears the same store-backed history shown here.</div>
              </section>

              <ChartPanel title="Relative rock displacement" subtitle="Solid lines are simulated observations. Dashed lines are the existing GARC simplified geometry-aware expected-deformation baseline.">
                <DisplacementChart nodes={nodes} selectedNodeIds={comparisonIds} garcHistory={garcHistory} thresholds={thresholds} timeRange={timeRange} annotations={displacementAnnotations} />
              </ChartPanel>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <ChartPanel title="Tilt trend" subtitle="Degrees; warning and critical limits are shown on the timeline.">
                  <TiltChart node={focusedNode} garcHistory={garcHistory} thresholds={thresholds} timeRange={timeRange} annotations={tiltAnnotations} />
                </ChartPanel>
                <ChartPanel title="Vibration trend" subtitle="Peak velocity in mm/s before, during, and after scenario events.">
                  <VibrationChart node={focusedNode} garcHistory={garcHistory} thresholds={thresholds} timeRange={timeRange} annotations={vibrationAnnotations} />
                </ChartPanel>
                <ChartPanel title="Crack width progression" subtitle="Millimetres; threshold crossings make initiation and growth easy to inspect.">
                  <CrackWidthChart node={focusedNode} garcHistory={garcHistory} thresholds={thresholds} timeRange={timeRange} annotations={crackAnnotations} />
                </ChartPanel>
                <ChartPanel title="GARC residual" subtitle="Observed displacement minus the simplified geometry-aware expected deformation; this is simulation analysis, not a validated mine-site model.">
                  <GARCResidualChart node={focusedNode} garcHistory={garcHistory} thresholds={thresholds} timeRange={timeRange} annotations={residualAnnotations} />
                </ChartPanel>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
              <Activity size={56} className="mb-4 opacity-50" />
              <h3 className="text-xl text-slate-300">No sensor nodes available</h3>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const StatusMetric = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex min-w-[64px] flex-col items-center gap-1">
    {icon}<span className="text-xs font-mono text-slate-100">{value}</span><span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
  </div>
);

const MetricBox = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="rounded-lg border border-[#1e2a3a] bg-[#1a2332] p-4">
    <div className="mb-2 flex items-center justify-between text-sm text-slate-400"><span>{label}</span><span className="opacity-55">{icon}</span></div>
    <div className="font-mono text-lg font-bold text-slate-100">{value}</div>
  </div>
);

const ChartPanel = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-[#1e2a3a] bg-[#1a2332] p-4">
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>
    <div className="mt-3 min-w-0">{children}</div>
  </section>
);

export default LiveMonitoring;
