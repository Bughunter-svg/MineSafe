import { describe, expect, it } from 'vitest';
import { PredictionEngine } from '@/engine/PredictionEngine';
import { SensorNode } from '@/types';
import { buildForecastSeries } from './Prediction';

const startTime = 1_790_765_364_000;

const makeNode = (): SensorNode => {
  const history = Array.from({ length: 8 }, (_, index) => ({
    timestamp: startTime + index * 1_000,
    tilt: 0.05,
    vibration: 0.3,
    displacement: 1 + index * 0.25,
    crackWidth: 0.1,
    battery: 90,
    signalStrength: -65,
    temperature: 28,
  }));

  return {
    id: 'N01', name: 'Node A1', x: 0, y: 0, lat: 0, lng: 0, zoneId: 'ZA', depth: 180,
    neighbours: [], online: true, hasFault: false, faultType: null, lastSeen: history[7].timestamp,
    currentReading: history[7], history,
  };
};

describe('Prediction forecast chart data', () => {
  it('keeps epoch-millisecond forecast values finite and maps them into chart fields', () => {
    const node = makeNode();
    const prediction = new PredictionEngine().predict(node, 24);
    const series = buildForecastSeries(node.history, prediction);

    expect(prediction.predictedValues).toHaveLength(24);
    expect(prediction.predictedValues.every(point => (
      Number.isFinite(point.time)
      && Number.isFinite(point.value)
      && Number.isFinite(point.lower)
      && Number.isFinite(point.upper)
      && point.lower <= point.upper
    ))).toBe(true);
    expect(series.invalidForecastCount).toBe(0);
    expect(series.data[0].historical).toBe(1);
    const lastPoint = series.data[series.data.length - 1];
    expect(lastPoint.predicted).toBeDefined();
    expect(lastPoint.uncertaintyRange?.[0]).toBeLessThanOrEqual(lastPoint.uncertaintyRange?.[1] ?? Number.NEGATIVE_INFINITY);
  });
});
