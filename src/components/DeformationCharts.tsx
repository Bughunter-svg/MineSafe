import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  GARCResult,
  RiskLevel,
  ScenarioEvent,
  SensorNode,
  SensorReading,
  ThresholdConfig,
} from '@/types';

export type TimeRange = '1m' | '5m' | '15m' | 'All';
type MetricKey = 'displacement' | 'tilt' | 'vibration' | 'crackWidth' | 'residual';

export interface ChartAnnotation {
  id: string;
  timestamp: number;
  label: string;
  detail: string;
  kind: 'scenario' | 'threshold' | 'fault' | 'risk';
  nodeIds?: string[];
  riskLevel?: RiskLevel;
}

interface TimelineDatum {
  timestamp: number;
  events?: ChartAnnotation[];
  risks?: Record<string, RiskLevel>;
  [key: string]: number | string | ChartAnnotation[] | Record<string, RiskLevel> | undefined;
}

interface Timestamped { timestamp: number; }

const NODE_COLORS = ['#38bdf8', '#fb7185', '#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#22d3ee', '#fb923c', '#a3e635', '#818cf8'];
const GRID_STROKE = '#2a3a4e';
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#111827',
  border: '1px solid #475569',
  borderRadius: '6px',
  color: '#f8fafc',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
};

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], {
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

const rangeMs = (range: TimeRange): number | null => {
  if (range === '1m') return 60_000;
  if (range === '5m') return 300_000;
  if (range === '15m') return 900_000;
  return null;
};

const filterByRange = <T extends Timestamped>(items: T[], range: TimeRange): T[] => {
  const windowMs = rangeMs(range);
  if (windowMs === null || items.length === 0) return items;
  const latest = items.reduce((max, item) => Math.max(max, item.timestamp), 0);
  return items.filter(item => item.timestamp >= latest - windowMs);
};

const getAnnotationColor = (annotation: ChartAnnotation): string => {
  if (annotation.kind === 'fault') return '#ef4444';
  if (annotation.kind === 'threshold') return '#f59e0b';
  if (annotation.kind === 'risk') {
    if (annotation.riskLevel === 'Critical') return '#ef4444';
    if (annotation.riskLevel === 'High') return '#f97316';
    if (annotation.riskLevel === 'Moderate') return '#f59e0b';
    return '#eab308';
  }
  return '#38bdf8';
};

const getThreshold = (metric: MetricKey, thresholds: ThresholdConfig) => {
  switch (metric) {
    case 'tilt': return { warning: thresholds.tiltWarning, critical: thresholds.tiltCritical, unit: '°', absolute: true };
    case 'vibration': return { warning: thresholds.vibrationWarning, critical: thresholds.vibrationCritical, unit: ' mm/s', absolute: false };
    case 'crackWidth': return { warning: thresholds.crackWarning, critical: thresholds.crackCritical, unit: ' mm', absolute: false };
    case 'residual': return { warning: thresholds.residualWarning, critical: thresholds.residualCritical, unit: ' mm', absolute: true };
    default: return { warning: thresholds.displacementWarning, critical: thresholds.displacementCritical, unit: ' mm', absolute: true };
  }
};

const getReadingValue = (reading: SensorReading, metric: Exclude<MetricKey, 'residual'>): number => reading[metric];

const formatScenarioLabel = (event: ScenarioEvent): string => {
  if (event.type === 'node_failure') return 'Sensor node offline';
  if (event.type === 'sensor_fault') return 'Sensor fault begins';
  if (event.type === 'gateway_disconnect') return 'Gateway disconnect';
  if (event.type === 'recovery') return 'Recovery begins';
  return `${event.type.replace('_', ' ')} begins`;
};

/** Builds annotations from the existing scenario, readings, and GARC assessments. */
export const buildTimelineAnnotations = ({
  nodes,
  nodeIds,
  garcHistory,
  scenarioEvents,
  simulationStartTime,
  currentTime,
  thresholds,
  metric,
}: {
  nodes: SensorNode[];
  nodeIds: string[];
  garcHistory: GARCResult[];
  scenarioEvents: ScenarioEvent[];
  simulationStartTime: number;
  currentTime: number;
  thresholds: ThresholdConfig;
  metric: MetricKey;
}): ChartAnnotation[] => {
  const annotations: ChartAnnotation[] = [];
  const selected = new Set(nodeIds);
  const threshold = getThreshold(metric, thresholds);

  scenarioEvents.forEach(event => {
    const isRelevant = event.nodeIds.length === 0 || event.nodeIds.some(id => selected.has(id));
    const timestamp = simulationStartTime + event.time * 1000;
    if (!isRelevant || timestamp > currentTime) return;
    const isFault = event.type === 'node_failure' || event.type === 'sensor_fault' || event.type === 'gateway_disconnect';
    annotations.push({
      id: `scenario-${event.type}-${event.time}-${event.nodeIds.join('-')}`,
      timestamp,
      label: formatScenarioLabel(event),
      detail: event.description,
      kind: isFault ? 'fault' : 'scenario',
      nodeIds: event.nodeIds,
    });
  });

  if (metric === 'residual') {
    nodeIds.forEach(nodeId => {
      const results = garcHistory.filter(result => result.nodeId === nodeId).sort((a, b) => a.timestamp - b.timestamp);
      for (let index = 1; index < results.length; index += 1) {
        const previous = Math.abs(results[index - 1].residual);
        const current = Math.abs(results[index].residual);
        (['warning', 'critical'] as const).forEach(level => {
          if (previous < threshold[level] && current >= threshold[level]) {
            annotations.push({
              id: `threshold-${metric}-${nodeId}-${level}-${results[index].timestamp}`,
              timestamp: results[index].timestamp,
              label: `${nodeId} ${level} residual`,
              detail: `Residual reached ${results[index].residual.toFixed(2)}${threshold.unit}; ${level} threshold is ${threshold[level]}${threshold.unit}.`,
              kind: 'threshold',
              nodeIds: [nodeId],
              riskLevel: results[index].riskLevel,
            });
          }
        });
      }
    });
  } else {
    nodeIds.forEach(nodeId => {
      const history = nodes.find(node => node.id === nodeId)?.history ?? [];
      for (let index = 1; index < history.length; index += 1) {
        const previousValue = getReadingValue(history[index - 1], metric);
        const currentValue = getReadingValue(history[index], metric);
        const previous = threshold.absolute ? Math.abs(previousValue) : previousValue;
        const current = threshold.absolute ? Math.abs(currentValue) : currentValue;
        (['warning', 'critical'] as const).forEach(level => {
          if (previous < threshold[level] && current >= threshold[level]) {
            annotations.push({
              id: `threshold-${metric}-${nodeId}-${level}-${history[index].timestamp}`,
              timestamp: history[index].timestamp,
              label: `${nodeId} ${level} threshold`,
              detail: `${metric === 'crackWidth' ? 'Crack width' : metric} reached ${currentValue.toFixed(2)}${threshold.unit}; ${level} threshold is ${threshold[level]}${threshold.unit}.`,
              kind: 'threshold',
              nodeIds: [nodeId],
            });
          }
        });
      }
    });
  }

  nodeIds.forEach(nodeId => {
    const results = garcHistory.filter(result => result.nodeId === nodeId).sort((a, b) => a.timestamp - b.timestamp);
    for (let index = 1; index < results.length; index += 1) {
      if (results[index].riskLevel !== results[index - 1].riskLevel) {
        annotations.push({
          id: `risk-${nodeId}-${results[index].timestamp}`,
          timestamp: results[index].timestamp,
          label: `${nodeId}: ${results[index].riskLevel}`,
          detail: `Risk changed from ${results[index - 1].riskLevel} to ${results[index].riskLevel}. ${results[index].explanation}`,
          kind: 'risk',
          nodeIds: [nodeId],
          riskLevel: results[index].riskLevel,
        });
      }
    }
  });

  return annotations.sort((a, b) => a.timestamp - b.timestamp);
};

const attachAnnotations = (data: TimelineDatum[], annotations: ChartAnnotation[]): TimelineDatum[] => {
  const rows = data.map(point => ({ ...point, events: point.events ? [...point.events] : undefined }));
  if (rows.length === 0) return rows;
  const firstTimestamp = rows[0].timestamp;
  annotations.forEach(annotation => {
    if (annotation.timestamp < firstTimestamp) return;
    const lastTimestamp = rows[rows.length - 1].timestamp;
    // A failed node stops producing readings. Preserve its event on the timeline
    // with an event-only row instead of inventing a zero-valued telemetry point.
    if (annotation.timestamp > lastTimestamp) {
      rows.push({ timestamp: annotation.timestamp, events: [annotation] });
      return;
    }
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    rows.forEach((row, index) => {
      const distance = Math.abs(row.timestamp - annotation.timestamp);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    const target = rows[closestIndex];
    target.events = [...(target.events ?? []), annotation];
  });
  return rows;
};

const visibleAnnotations = (annotations: ChartAnnotation[], data: TimelineDatum[]) => {
  if (data.length === 0) return [];
  const first = data[0].timestamp;
  const last = data[data.length - 1].timestamp;
  const inRange = annotations.filter(item => item.timestamp >= first && item.timestamp <= last);
  // Scenario starts and failures are always retained. The newest threshold/risk
  // markers fill the remaining space so dense transitions do not obscure the chart.
  const structural = inRange.filter(item => item.kind === 'scenario' || item.kind === 'fault');
  const changing = inRange.filter(item => item.kind === 'threshold' || item.kind === 'risk').slice(-12);
  return [...structural, ...changing].sort((a, b) => a.timestamp - b.timestamp);
};

const EventReferenceLines: React.FC<{ annotations: ChartAnnotation[]; data: TimelineDatum[] }> = ({ annotations, data }) => (
  <>
    {visibleAnnotations(annotations, data).map((annotation, index) => (
      <ReferenceLine
        key={annotation.id}
        x={annotation.timestamp}
        stroke={getAnnotationColor(annotation)}
        strokeDasharray={annotation.kind === 'risk' ? '2 3' : '4 3'}
        strokeOpacity={0.9}
        label={index < 4 ? {
          value: annotation.label,
          position: 'insideTopRight',
          fill: getAnnotationColor(annotation),
          fontSize: 10,
        } : undefined}
      />
    ))}
  </>
);

interface TooltipPayloadEntry {
  color?: string;
  name?: string;
  payload?: TimelineDatum;
  value?: number | string;
}

const TelemetryTooltip: React.FC<{
  active?: boolean;
  label?: number | string;
  nodeIds: string[];
  payload?: TooltipPayloadEntry[];
  unit: string;
  showGarcDetails?: boolean;
}> = ({ active, label, nodeIds, payload, unit, showGarcDetails = false }) => {
  if (!active || !payload?.length) return null;
  const row = payload.find(entry => entry.payload)?.payload;
  const events = row?.events ?? [];
  const risks = Object.entries(row?.risks ?? {});
  const numericEntries = payload.filter(entry => typeof entry.value === 'number');

  return (
    <div style={TOOLTIP_STYLE} className="max-w-xs px-3 py-2 text-xs">
      <div className="mb-1 flex items-center justify-between gap-4 text-slate-300">
        <span>{typeof label === 'number' ? formatTime(label) : label}</span>
        <span className="font-mono text-slate-400">{nodeIds.join(', ')}</span>
      </div>
      {showGarcDetails && row && (
        <div className="mb-2 border-y border-slate-700 py-1.5 text-slate-200">
          <div>Observed: <span className="font-mono">{Number(row.observedDeformation ?? 0).toFixed(2)} mm</span></div>
          <div>GARC expected: <span className="font-mono">{Number(row.expectedDeformation ?? 0).toFixed(2)} mm</span></div>
          <div>Residual: <span className="font-mono">{Number(row.residual ?? 0).toFixed(2)} mm</span></div>
          <div>Neighbour agreement: <span className="font-mono">{(Number(row.neighbourAgreement ?? 0) * 100).toFixed(0)}%</span></div>
        </div>
      )}
      {numericEntries.map((entry, index) => (
        <div key={`${entry.name}-${index}`} className="flex justify-between gap-4" style={{ color: entry.color ?? '#e2e8f0' }}>
          <span>{entry.name}</span>
          <span className="font-mono">{Number(entry.value).toFixed(2)}{unit}</span>
        </div>
      ))}
      {risks.length > 0 && <div className="mt-1 border-t border-slate-700 pt-1 text-slate-300">Risk: {risks.map(([nodeId, level]) => `${nodeId} ${level}`).join(' · ')}</div>}
      {events.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-700 pt-2 text-slate-200">
          {events.map(event => <div key={event.id}><span style={{ color: getAnnotationColor(event) }} className="font-semibold">{event.label}:</span> {event.detail}</div>)}
        </div>
      )}
    </div>
  );
};

const EmptyChart: React.FC<{ message: string; height?: string }> = ({ message, height = 'h-[230px]' }) => (
  <div className={`flex ${height} items-center justify-center rounded border border-dashed border-slate-700 px-4 text-center text-sm text-slate-500`}>{message}</div>
);

const axisProps = (label: string) => ({
  stroke: '#94a3b8', fontSize: 10, width: 66,
  label: { value: label, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, offset: 8 },
});

export const TimeRangeSelector: React.FC<{ range: TimeRange; onRangeChange: (range: TimeRange) => void }> = ({ range, onRangeChange }) => {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: '1m', label: '1 min' }, { value: '5m', label: '5 min' }, { value: '15m', label: '15 min' }, { value: 'All', label: 'All' },
  ];
  return <div className="flex flex-wrap gap-1.5" aria-label="Chart time range">
    {ranges.map(item => <button key={item.value} type="button" onClick={() => onRangeChange(item.value)} className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${range === item.value ? 'border-sky-400 bg-sky-500/20 text-sky-200' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>{item.label}</button>)}
  </div>;
};

export const NodeSelector: React.FC<{
  nodes: SensorNode[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxSelections?: number;
}> = ({ nodes, selectedIds, onToggle, maxSelections = 4 }) => (
  <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Sensors included in displacement comparison">
    {nodes.map(node => {
      const selectionIndex = selectedIds.indexOf(node.id);
      const isSelected = selectionIndex >= 0;
      const atLimit = !isSelected && selectedIds.length >= maxSelections;
      const color = NODE_COLORS[(isSelected ? selectionIndex : 0) % NODE_COLORS.length];
      return <button key={node.id} type="button" disabled={atLimit} onClick={() => onToggle(node.id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200'} ${atLimit ? 'cursor-not-allowed opacity-45' : ''}`} style={{ borderColor: isSelected ? color : undefined }} title={atLimit ? `Compare up to ${maxSelections} sensors at once` : node.name}>
        <span className={`h-2 w-2 rounded-full ${node.online ? 'bg-emerald-400' : 'bg-red-500'}`} />{node.name} <span className="font-mono text-slate-500">{node.id}</span>
      </button>;
    })}
  </div>
);

const buildDisplacementData = (nodes: SensorNode[], selectedNodeIds: string[], garcHistory: GARCResult[]): TimelineDatum[] => {
  const rows = new Map<number, TimelineDatum>();
  selectedNodeIds.forEach(nodeId => {
    nodes.find(item => item.id === nodeId)?.history.forEach(reading => {
      const row = rows.get(reading.timestamp) ?? { timestamp: reading.timestamp };
      row[`observed_${nodeId}`] = reading.displacement;
      rows.set(reading.timestamp, row);
    });
  });
  garcHistory.filter(result => selectedNodeIds.includes(result.nodeId)).forEach(result => {
    const row = rows.get(result.timestamp) ?? { timestamp: result.timestamp };
    row[`expected_${result.nodeId}`] = result.expectedDeformation;
    row.risks = { ...(row.risks ?? {}), [result.nodeId]: result.riskLevel };
    rows.set(result.timestamp, row);
  });
  return Array.from(rows.values()).sort((a, b) => a.timestamp - b.timestamp);
};

export const DisplacementChart: React.FC<{
  nodes: SensorNode[];
  selectedNodeIds: string[];
  garcHistory: GARCResult[];
  thresholds: ThresholdConfig;
  timeRange: TimeRange;
  annotations?: ChartAnnotation[];
}> = ({ nodes, selectedNodeIds, garcHistory, thresholds, timeRange, annotations = [] }) => {
  const data = useMemo(() => attachAnnotations(filterByRange(buildDisplacementData(nodes, selectedNodeIds, garcHistory), timeRange), annotations), [nodes, selectedNodeIds, garcHistory, timeRange, annotations]);
  if (data.length === 0) return <EmptyChart message="Start a simulation to populate the displacement trend." height="h-[320px]" />;

  return <ResponsiveContainer width="100%" height={340}>
    <LineChart data={data} margin={{ top: 18, right: 24, left: 8, bottom: 8 }}>
      <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} stroke="#94a3b8" fontSize={10} tickFormatter={formatTime} minTickGap={34} />
      <YAxis {...axisProps('Relative displacement (mm)')} />
      <Tooltip content={<TelemetryTooltip nodeIds={selectedNodeIds} unit=" mm" />} />
      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
      <ReferenceLine y={thresholds.displacementWarning} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: 'Warning', position: 'insideTopRight', fill: '#fbbf24', fontSize: 10 }} />
      <ReferenceLine y={thresholds.displacementCritical} stroke="#ef4444" strokeDasharray="5 4" label={{ value: 'Critical', position: 'insideBottomRight', fill: '#f87171', fontSize: 10 }} />
      <EventReferenceLines annotations={annotations} data={data} />
      {selectedNodeIds.map((nodeId, index) => {
        const node = nodes.find(item => item.id === nodeId);
        const color = NODE_COLORS[index % NODE_COLORS.length];
        const hasBaseline = garcHistory.some(result => result.nodeId === nodeId);
        return <React.Fragment key={nodeId}>
          <Line type="monotone" dataKey={`observed_${nodeId}`} name={`${node?.name ?? nodeId} observed (${nodeId})`} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          {hasBaseline && <Line type="monotone" dataKey={`expected_${nodeId}`} name={`${node?.name ?? nodeId} GARC expected`} stroke={color} strokeWidth={1.5} strokeDasharray="6 4" strokeOpacity={0.8} dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />}
        </React.Fragment>;
      })}
    </LineChart>
  </ResponsiveContainer>;
};

const buildMetricData = (history: SensorReading[], nodeId: string, garcHistory: GARCResult[]): TimelineDatum[] => {
  const garcByTimestamp = new Map(garcHistory.filter(result => result.nodeId === nodeId).map(result => [result.timestamp, result]));
  return history.map(reading => {
    const result = garcByTimestamp.get(reading.timestamp);
    return { timestamp: reading.timestamp, tilt: reading.tilt, vibration: reading.vibration, crackWidth: reading.crackWidth, risks: result ? { [nodeId]: result.riskLevel } : undefined };
  });
};

interface NodeMetricChartProps {
  node: SensorNode;
  garcHistory: GARCResult[];
  thresholds: ThresholdConfig;
  timeRange: TimeRange;
  annotations?: ChartAnnotation[];
}

const NodeMetricChart: React.FC<NodeMetricChartProps & { metric: Exclude<MetricKey, 'displacement' | 'residual'>; color: string; title: string; useArea?: boolean }> = ({ node, garcHistory, thresholds, timeRange, annotations = [], metric, color, title, useArea = false }) => {
  const threshold = getThreshold(metric, thresholds);
  const data = useMemo(() => attachAnnotations(filterByRange(buildMetricData(node.history, node.id, garcHistory), timeRange), annotations), [node.history, node.id, garcHistory, timeRange, annotations]);
  const gradientId = `${metric}-${node.id}`;
  if (data.length === 0) return <EmptyChart message={`No ${title.toLowerCase()} samples yet.`} />;

  const common = <>
    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} stroke="#94a3b8" fontSize={10} tickFormatter={formatTime} minTickGap={34} />
    <YAxis {...axisProps(`${title} (${threshold.unit.trim()})`)} />
    <Tooltip content={<TelemetryTooltip nodeIds={[node.id]} unit={threshold.unit} />} />
    <ReferenceLine y={threshold.warning} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: 'Warning', position: 'insideTopRight', fill: '#fbbf24', fontSize: 10 }} />
    <ReferenceLine y={threshold.critical} stroke="#ef4444" strokeDasharray="5 4" label={{ value: 'Critical', position: 'insideBottomRight', fill: '#f87171', fontSize: 10 }} />
    <EventReferenceLines annotations={annotations} data={data} />
  </>;

  if (useArea) return <ResponsiveContainer width="100%" height={230}>
    <AreaChart data={data} margin={{ top: 18, right: 20, left: 8, bottom: 4 }}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.35} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      {common}<Area type="monotone" dataKey={metric} name={`${title} (${node.id})`} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>;

  return <ResponsiveContainer width="100%" height={230}>
    <LineChart data={data} margin={{ top: 18, right: 20, left: 8, bottom: 4 }}>
      {common}<Line type="monotone" dataKey={metric} name={`${title} (${node.id})`} stroke={color} strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
    </LineChart>
  </ResponsiveContainer>;
};

export const TiltChart: React.FC<NodeMetricChartProps> = props => <NodeMetricChart {...props} metric="tilt" color="#a78bfa" title="Tilt" useArea />;
export const VibrationChart: React.FC<NodeMetricChartProps> = props => <NodeMetricChart {...props} metric="vibration" color="#22d3ee" title="Vibration" />;
export const CrackWidthChart: React.FC<NodeMetricChartProps> = props => <NodeMetricChart {...props} metric="crackWidth" color="#fbbf24" title="Crack width" useArea />;

export const GARCResidualChart: React.FC<{
  node: SensorNode;
  garcHistory: GARCResult[];
  thresholds: ThresholdConfig;
  timeRange: TimeRange;
  annotations?: ChartAnnotation[];
}> = ({ node, garcHistory, thresholds, timeRange, annotations = [] }) => {
  const results = useMemo(() => filterByRange(garcHistory.filter(result => result.nodeId === node.id).sort((a, b) => a.timestamp - b.timestamp), timeRange), [garcHistory, node.id, timeRange]);
  const data = useMemo(() => attachAnnotations(results.map(result => ({
    timestamp: result.timestamp, residual: result.residual, observedDeformation: result.observedDeformation, expectedDeformation: result.expectedDeformation, neighbourAgreement: result.neighbourAgreement, risks: { [node.id]: result.riskLevel },
  })), annotations), [results, annotations, node.id]);
  const latest = results[results.length - 1];
  const corroborated = latest ? Math.abs(latest.residual) >= thresholds.residualWarning && latest.persistenceCount >= latest.persistenceThreshold && latest.neighbourAgreement >= thresholds.neighbourAgreementMin : false;
  if (data.length === 0) return <EmptyChart message="Run a simulation to see the GARC residual analysis." />;

  return <div>
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 18, right: 20, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} stroke="#94a3b8" fontSize={10} tickFormatter={formatTime} minTickGap={34} />
        <YAxis {...axisProps('Observed − expected (mm)')} />
        <Tooltip content={<TelemetryTooltip nodeIds={[node.id]} unit=" mm" showGarcDetails />} />
        <ReferenceLine y={0} stroke="#cbd5e1" strokeOpacity={0.65} label={{ value: 'Expected', position: 'insideTopLeft', fill: '#cbd5e1', fontSize: 10 }} />
        <ReferenceLine y={thresholds.residualWarning} stroke="#f59e0b" strokeDasharray="5 4" />
        <ReferenceLine y={-thresholds.residualWarning} stroke="#f59e0b" strokeDasharray="5 4" />
        <ReferenceLine y={thresholds.residualCritical} stroke="#ef4444" strokeDasharray="5 4" />
        <ReferenceLine y={-thresholds.residualCritical} stroke="#ef4444" strokeDasharray="5 4" />
        <EventReferenceLines annotations={annotations} data={data} />
        <Line type="monotone" dataKey="residual" name={`GARC residual (${node.id})`} stroke="#f472b6" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
    {latest && <div className={`mt-2 rounded border px-3 py-2 text-xs ${corroborated ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900/70 text-slate-400'}`}>
      {corroborated
        ? `Corroborated: residual persisted for ${latest.persistenceCount}/${latest.persistenceThreshold} readings and ${latest.agreeingNeighbours.length} neighbouring sensor(s) agree (${Math.round(latest.neighbourAgreement * 100)}%).`
        : `A persistent residual is corroborated only when it remains above the warning limit for ${latest.persistenceThreshold} readings and at least ${Math.round(thresholds.neighbourAgreementMin * 100)}% of neighbours agree. Latest agreement: ${Math.round(latest.neighbourAgreement * 100)}%.`}
    </div>}
  </div>;
};

export const CompactDisplacementTrend: React.FC<{ nodes: SensorNode[]; thresholds: ThresholdConfig; maxNodes?: number }> = ({ nodes, thresholds, maxNodes = 3 }) => {
  const topNodes = useMemo(() => [...nodes].filter(node => node.history.length > 0).sort((a, b) => b.currentReading.displacement - a.currentReading.displacement).slice(0, maxNodes), [nodes, maxNodes]);
  const data = useMemo(() => {
    const rows = new Map<number, TimelineDatum>();
    topNodes.forEach(node => node.history.forEach(reading => {
      const row = rows.get(reading.timestamp) ?? { timestamp: reading.timestamp };
      row[`compact_${node.id}`] = reading.displacement;
      rows.set(reading.timestamp, row);
    }));
    return Array.from(rows.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [topNodes]);
  if (data.length === 0) return <EmptyChart message="Trend history will appear as the simulation runs." height="h-[150px]" />;

  return <ResponsiveContainer width="100%" height={160}>
    <LineChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 2 }}>
      <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} stroke="#64748b" fontSize={10} tickFormatter={formatTime} minTickGap={38} />
      <YAxis stroke="#64748b" fontSize={10} width={48} />
      <Tooltip content={<TelemetryTooltip nodeIds={topNodes.map(node => node.id)} unit=" mm" />} />
      <ReferenceLine y={thresholds.displacementWarning} stroke="#f59e0b" strokeDasharray="4 3" />
      {topNodes.map((node, index) => <Line key={node.id} type="monotone" dataKey={`compact_${node.id}`} name={`${node.name} (${node.id})`} stroke={NODE_COLORS[index % NODE_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />)}
    </LineChart>
  </ResponsiveContainer>;
};
