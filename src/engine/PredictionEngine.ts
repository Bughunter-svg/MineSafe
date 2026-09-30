// ===== Prediction Engine =====
// Demonstration prediction model using linear regression + exponential smoothing
// This is NOT a validated prediction system. Labels all output as simulated.

import { SensorNode, PredictionResult } from '@/types';

export class PredictionEngine {
  /**
   * Generate a simulated forecast for a node's displacement.
   * Uses simple linear trend extrapolation with uncertainty bands.
   * 
   * NOTE: This is a demonstration model, NOT a validated operational prediction.
   */
  predict(node: SensorNode, forecastHours: number = 24): PredictionResult {
    const history = node.history.slice(-30); // Last 30 readings
    
    if (history.length < 5) {
      return {
        nodeId: node.id,
        currentDisplacement: node.currentReading.displacement,
        forecastHorizon: forecastHours,
        predictedValues: [],
        trend: 'stable',
        confidence: 0,
        modelNote: 'Insufficient data for prediction (need ≥5 readings). This is a demonstration model.',
      };
    }

    // Extract displacement values. Timestamps are epoch milliseconds, so regression
    // uses elapsed milliseconds from the first sample to avoid catastrophic precision
    // loss in sum(x²) when working directly with ~1.8e12-sized values.
    const values = history.map(r => r.displacement);
    const times = history.map(r => r.timestamp);
    const timeOrigin = times[0];
    const elapsedTimes = times.map(time => time - timeOrigin);

    // Simple linear regression
    const n = values.length;
    const sumX = elapsedTimes.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = elapsedTimes.reduce((acc, x, i) => acc + x * values[i], 0);
    const sumX2 = elapsedTimes.reduce((acc, x) => acc + x * x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    const slope = Math.abs(denominator) > Number.EPSILON
      ? (n * sumXY - sumX * sumY) / denominator
      : 0;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² for confidence
    const yMean = sumY / n;
    const ssTotal = values.reduce((acc, y) => acc + (y - yMean) ** 2, 0);
    const ssResidual = values.reduce((acc, y, i) => {
      const predicted = slope * elapsedTimes[i] + intercept;
      return acc + (y - predicted) ** 2;
    }, 0);
    const r2 = Math.max(0, 1 - ssResidual / (ssTotal + 1e-10));

    // Calculate standard error for uncertainty bands
    const stdError = Math.sqrt(ssResidual / (n - 2 + 1e-10));

    // Determine trend
    const slopePerHour = slope * 3600000; // slope per ms -> per hour
    let trend: 'stable' | 'increasing' | 'decreasing' | 'accelerating';
    
    // Check for acceleration (compare recent vs early slope)
    if (values.length >= 10) {
      const recentSlope = (values[values.length - 1] - values[values.length - 5]) / 5;
      const earlySlope = (values[4] - values[0]) / 5;
      if (recentSlope > earlySlope * 1.5 && recentSlope > 0.1) {
        trend = 'accelerating';
      } else if (Math.abs(slopePerHour) < 0.1) {
        trend = 'stable';
      } else if (slopePerHour > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }
    } else {
      if (Math.abs(slopePerHour) < 0.1) trend = 'stable';
      else if (slopePerHour > 0) trend = 'increasing';
      else trend = 'decreasing';
    }

    // Generate forecast points
    const lastTime = times[times.length - 1];
    const stepMs = (forecastHours * 3600000) / 24; // 24 forecast points
    const predictedValues: PredictionResult['predictedValues'] = [];

    for (let i = 1; i <= 24; i++) {
      const futureTime = lastTime + stepMs * i;
      const futureElapsed = futureTime - timeOrigin;
      const predicted = slope * futureElapsed + intercept;
      const uncertainty = stdError * (1 + 0.5 * i / 24); // Growing uncertainty

      // The simulated source data is finite, but guard the chart contract so an
      // unexpected model failure can never inject NaN/Infinity into Recharts.
      const safePrediction = Number.isFinite(predicted) ? predicted : values[values.length - 1];
      const safeUncertainty = Number.isFinite(uncertainty) ? uncertainty : 0;
      
      predictedValues.push({
        time: futureTime,
        value: Math.round(Math.max(0, safePrediction) * 1000) / 1000,
        lower: Math.round(Math.max(0, safePrediction - 1.96 * safeUncertainty) * 1000) / 1000,
        upper: Math.round(Math.max(0, safePrediction + 1.96 * safeUncertainty) * 1000) / 1000,
      });
    }

    return {
      nodeId: node.id,
      currentDisplacement: node.currentReading.displacement,
      forecastHorizon: forecastHours,
      predictedValues,
      trend,
      confidence: Math.round(r2 * 100),
      modelNote: '⚠ DEMONSTRATION MODEL — Linear regression with uncertainty bands. Not validated for operational mine safety prediction.',
    };
  }
}
