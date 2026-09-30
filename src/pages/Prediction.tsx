import React, { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ChevronsUp, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PredictionResult, SensorNode, SensorReading } from '@/types';

interface ForecastChartPoint {
  time: number;
  historical?: number;
  predicted?: number;
  lowerBound?: number;
  upperBound?: number;
  uncertaintyRange?: [number, number];
}

interface ForecastSeries {
  data: ForecastChartPoint[];
  invalidForecastCount: number;
}

interface ForecastTooltipPayload {
  payload?: ForecastChartPoint;
}

const HORIZON_HOURS = { '12h': 12, '24h': 24, '48h': 48 } as const;

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

// SimulationEngine timestamps are created from Date.now() and incremented in
// milliseconds, so they are already valid epoch milliseconds for Date/Recharts.
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Invalid time';
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatAxisTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const buildForecastSeries = (
  history: SensorReading[],
  prediction: PredictionResult | null | undefined,
): ForecastSeries => {
  const historicalReadings = history
    .filter(reading => isFiniteNumber(reading.timestamp) && isFiniteNumber(reading.displacement))
    .slice(-30)
    .sort((a, b) => a.timestamp - b.timestamp);
  const data: ForecastChartPoint[] = historicalReadings.map(reading => ({
    time: reading.timestamp,
    historical: reading.displacement,
  }));
  const lastHistorical = data[data.length - 1];
  let invalidForecastCount = 0;

  // The forecast line starts from the final observed sample, so a valid forecast
  // connects to the actual history without pretending that origin value is a model output.
  if (lastHistorical && isFiniteNumber(lastHistorical.historical)) {
    lastHistorical.predicted = lastHistorical.historical;
    lastHistorical.lowerBound = lastHistorical.historical;
    lastHistorical.upperBound = lastHistorical.historical;
    lastHistorical.uncertaintyRange = [lastHistorical.historical, lastHistorical.historical];
  }

  const lastHistoricalTime = lastHistorical?.time ?? Number.NEGATIVE_INFINITY;
  (prediction?.predictedValues ?? []).forEach(point => {
    const hasValidValues = isFiniteNumber(point.time)
      && isFiniteNumber(point.value)
      && isFiniteNumber(point.lower)
      && isFiniteNumber(point.upper);
    if (!hasValidValues || point.time <= lastHistoricalTime) {
      invalidForecastCount += 1;
      return;
    }

    const lowerBound = Math.min(point.lower, point.upper);
    const upperBound = Math.max(point.lower, point.upper);
    data.push({
      time: point.time,
      predicted: point.value,
      lowerBound,
      upperBound,
      uncertaintyRange: [lowerBound, upperBound],
    });
  });

  return { data: data.sort((a, b) => a.time - b.time), invalidForecastCount };
};

const getYAxisDomain = (data: ForecastChartPoint[]): [number, number] => {
  const values = data.flatMap(point => [
    point.historical,
    point.predicted,
    point.lowerBound,
    point.upperBound,
  ].filter(isFiniteNumber));

  if (values.length === 0) return [0, 1];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, 0.5);
  const padding = Math.max(span * 0.15, 0.15);
  return [
    Math.floor((minimum - padding) * 10) / 10,
    Math.ceil((maximum + padding) * 10) / 10,
  ];
};

const ForecastTooltip: React.FC<{
  active?: boolean;
  payload?: ForecastTooltipPayload[];
}> = ({ active, payload }) => {
  const point = payload?.find(item => item.payload)?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-md border border-slate-600 bg-[#111827] px-3 py-2 text-xs text-slate-100 shadow-xl">
      <div className="mb-2 text-slate-400">{formatTimestamp(point.time)}</div>
      {isFiniteNumber(point.historical) && <div className="flex justify-between gap-5 text-blue-300"><span>Historical</span><span className="font-mono">{point.historical.toFixed(2)} mm</span></div>}
      {isFiniteNumber(point.predicted) && <div className="flex justify-between gap-5 text-orange-300"><span>Predicted</span><span className="font-mono">{point.predicted.toFixed(2)} mm</span></div>}
      {isFiniteNumber(point.lowerBound) && isFiniteNumber(point.upperBound) && (
        <div className="mt-1 flex justify-between gap-5 border-t border-slate-700 pt-1 text-slate-300"><span>95% interval</span><span className="font-mono">{point.lowerBound.toFixed(2)}–{point.upperBound.toFixed(2)} mm</span></div>
      )}
    </div>
  );
};

const Prediction = () => {
  const { nodes, getPrediction, selectedNodeId, selectNode } = useAppStore();
  const [horizon, setHorizon] = useState<'12h' | '24h' | '48h'>('24h');
  const selectedNode = useMemo(
    () => nodes.find((node: SensorNode) => node.id === selectedNodeId),
    [nodes, selectedNodeId],
  );
  const prediction = useMemo(
    () => selectedNode ? getPrediction(selectedNode.id, HORIZON_HOURS[horizon]) ?? null : null,
    [selectedNode, horizon, getPrediction],
  );
  const forecastSeries = useMemo(
    () => buildForecastSeries(selectedNode?.history ?? [], prediction),
    [selectedNode?.history, prediction],
  );
  const yAxisDomain = useMemo(() => getYAxisDomain(forecastSeries.data), [forecastSeries.data]);
  const forecastOrigin = forecastSeries.data.find(point => isFiniteNumber(point.historical) && isFiniteNumber(point.predicted))?.time;

  const renderTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'accelerating': return <ChevronsUp className="h-6 w-6 text-red-500" />;
      case 'increasing': return <TrendingUp className="h-6 w-6 text-amber-500" />;
      case 'decreasing': return <TrendingDown className="h-6 w-6 text-emerald-500" />;
      case 'stable': default: return <Minus className="h-6 w-6 text-blue-500" />;
    }
  };

  const hasForecast = forecastSeries.data.some(point => isFiniteNumber(point.predicted) && point.time !== forecastOrigin);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-[#0f1419] p-6 font-sans text-gray-200">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-white">Predictive Analytics</h1>
          <p className="text-sm text-gray-400">AI-driven displacement forecasting model</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-400">Select Node:</label>
          <select
            className="rounded border border-gray-600 bg-[#1a2332] px-3 py-2 text-white shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
            value={selectedNodeId || ''}
            onChange={event => selectNode(event.target.value)}
          >
            <option value="" disabled>-- Select a Node --</option>
            {nodes.map((node: SensorNode) => <option key={node.id} value={node.id}>{node.name || node.id}</option>)}
          </select>
        </div>
      </div>

      {!selectedNodeId ? (
        <EmptyPredictionState message="Please select a node to view predictions." />
      ) : !prediction || !hasForecast ? (
        <EmptyPredictionState message="Awaiting at least five valid simulated sensor readings before generating a forecast." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard label="Current Displacement" value={`${selectedNode?.currentReading.displacement.toFixed(2) ?? '0.00'} mm`} />
            <div className="flex flex-col gap-1 rounded-lg border border-gray-800 bg-[#1a2332] p-5 shadow-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Trend</span>
              <div className="flex items-center gap-2">{renderTrendIcon(prediction.trend)}<span className="text-xl font-bold capitalize text-white">{prediction.trend}</span></div>
            </div>
            <MetricCard label="Confidence Level" value={`${prediction.confidence}%`} color="text-blue-400" />
            <div className="flex flex-col justify-center gap-2 rounded-lg border border-gray-800 bg-[#1a2332] p-5 shadow-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Forecast Horizon</span>
              <div className="flex rounded bg-[#0f1419] p-1">
                {(Object.keys(HORIZON_HOURS) as Array<keyof typeof HORIZON_HOURS>).map(value => <button key={value} type="button" onClick={() => setHorizon(value)} className={`flex-1 rounded py-1 text-sm font-semibold transition-colors ${horizon === value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>{value}</button>)}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-gray-700 bg-[#1e2a3a] p-6 shadow-xl">
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Displacement Forecast ({horizon})</h2>
                <p className="text-xs text-gray-500">Latest 30 simulated sensor readings are the historical input to this demonstration model.</p>
              </div>
              <span className="text-xs text-slate-500">Time shown in local date/time</span>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastSeries.data} margin={{ top: 14, right: 30, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} stroke="#718096" tick={{ fill: '#a0aec0', fontSize: 11 }} tickMargin={10} tickFormatter={formatAxisTimestamp} tickCount={6} minTickGap={56} />
                  <YAxis domain={yAxisDomain} stroke="#718096" tick={{ fill: '#a0aec0', fontSize: 11 }} tickMargin={10} tickFormatter={value => `${Number(value).toFixed(1)}`} unit=" mm" width={66} />
                  <Tooltip content={<ForecastTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                  {forecastOrigin && <ReferenceLine x={forecastOrigin} stroke="#718096" strokeDasharray="3 3" label={{ position: 'top', value: 'Forecast origin', fill: '#a0aec0', fontSize: 11 }} />}
                  <Area type="monotone" dataKey="uncertaintyRange" name="95% uncertainty band" stroke="none" fill="#f6ad55" fillOpacity={0.2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="historical" name="Historical displacement" stroke="#3b82f6" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="predicted" name="Predicted displacement" stroke="#f6ad55" strokeWidth={2.4} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {forecastSeries.invalidForecastCount > 0 && <p className="mt-2 text-xs text-amber-300">{forecastSeries.invalidForecastCount} invalid forecast point(s) were excluded from the chart.</p>}
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex gap-3 border-l-4 border-orange-500 bg-orange-500/10 p-4 text-sm text-orange-200">
                <Info className="h-5 w-5 shrink-0 text-orange-500" />
                <div><p className="mb-1 font-semibold text-orange-400">Model Note</p><p>{prediction.modelNote}</p></div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1 text-center text-xs font-semibold text-gray-500"><AlertTriangle className="h-3 w-3" />⚠ DEMONSTRATION MODEL — Not validated for operational prediction</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) => (
  <div className="flex flex-col gap-1 rounded-lg border border-gray-800 bg-[#1a2332] p-5 shadow-lg">
    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
    <span className={`text-3xl font-bold ${color}`}>{value}</span>
  </div>
);

const EmptyPredictionState = ({ message }: { message: string }) => (
  <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-800 bg-[#1a2332] shadow-lg"><p className="text-lg text-gray-500">{message}</p></div>
);

export default Prediction;
