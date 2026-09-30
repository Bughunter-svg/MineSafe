// ===== GARC Engine =====
// Geometry-Aware Residual Consensus (GARC) implementation
// This is a DEMONSTRATION model — NOT a validated mining-geomechanics model.
// Thresholds are illustrative and must NOT be used for actual mine safety decisions.

import { SensorNode, GARCResult, RiskLevel, ThresholdConfig, MineZone } from '@/types';
import { MINE_CONFIG } from '@/data/mineData';

export class GARCEngine {
  private thresholds: ThresholdConfig;
  private persistenceMap: Map<string, number> = new Map(); // nodeId -> consecutive anomaly count
  private prevResiduals: Map<string, number[]> = new Map(); // nodeId -> last N residuals

  constructor(thresholds: ThresholdConfig) {
    this.thresholds = thresholds;
  }

  updateThresholds(thresholds: ThresholdConfig) {
    this.thresholds = thresholds;
  }

  reset() {
    this.persistenceMap.clear();
    this.prevResiduals.clear();
  }

  /**
   * Step 1: Calculate expected deformation using simplified geometry model.
   * Uses influence function method approximation based on:
   * - Panel dimensions, extraction depth, and angle of draw
   * - Distance from panel center
   * 
   * NOTE: This is a simplified demonstration model, NOT a validated subsidence prediction.
   */
  calculateExpectedDeformation(node: SensorNode, zone: MineZone): number {
    if (node.depth === 0) {
      // Surface node: use simplified profile
      const maxSurface = MINE_CONFIG.maxExpectedSubsidence * MINE_CONFIG.extractionRatio;
      // Distance from panel center (normalized)
      const panelCenterX = zone.bounds.x + zone.bounds.w / 2;
      const panelCenterY = zone.bounds.y + zone.bounds.h / 2;
      const dx = (node.x - panelCenterX) / (zone.bounds.w / 2);
      const dy = (node.y - panelCenterY) / (zone.bounds.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Gaussian-like influence profile
      const influence = Math.exp(-dist * dist / 2);
      return maxSurface * influence * 0.5; // Surface gets fraction
    }

    // Underground node: depth-based expected deformation
    const depthFactor = node.depth / MINE_CONFIG.extractionDepth;
    const extractionFactor = zone.panelExtent / 100;
    
    // Closer to panel center = more expected deformation
    const panelCenterX = zone.bounds.x + zone.bounds.w / 2;
    const panelCenterY = zone.bounds.y + zone.bounds.h / 2;
    const dx = (node.x - panelCenterX) / (zone.bounds.w / 2 + 1);
    const dy = (node.y - panelCenterY) / (zone.bounds.h / 2 + 1);
    const distNorm = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    const proxFactor = 1 - distNorm * 0.6;

    return MINE_CONFIG.maxExpectedSubsidence * depthFactor * extractionFactor * proxFactor * 0.15;
  }

  /**
   * Step 2: Calculate residual = observed - expected
   */
  calculateResidual(observed: number, expected: number): number {
    return observed - expected;
  }

  /**
   * Step 3: Check neighbour consensus
   * Returns fraction of neighbours with correlated anomalous behaviour
   */
  checkNeighbourConsensus(
    nodeId: string,
    nodeResidual: number,
    allNodes: SensorNode[],
    allResults: Map<string, { residual: number }>
  ): { agreement: number; agreeingNeighbours: string[] } {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node || node.neighbours.length === 0) {
      return { agreement: 0, agreeingNeighbours: [] };
    }

    const isNodeAnomalous = Math.abs(nodeResidual) > this.thresholds.residualWarning;
    if (!isNodeAnomalous) {
      return { agreement: 0, agreeingNeighbours: [] };
    }

    const agreeingNeighbours: string[] = [];
    for (const nId of node.neighbours) {
      const nResult = allResults.get(nId);
      if (nResult) {
        const nAnomalous = Math.abs(nResult.residual) > this.thresholds.residualWarning * 0.7;
        // Check same direction (both positive = sinking, or both show disturbance)
        const sameDirection = (nodeResidual > 0 && nResult.residual > 0) || 
                              (Math.abs(nResult.residual) > this.thresholds.residualWarning * 0.5);
        if (nAnomalous && sameDirection) {
          agreeingNeighbours.push(nId);
        }
      }
    }

    const agreement = agreeingNeighbours.length / node.neighbours.length;
    return { agreement, agreeingNeighbours };
  }

  /**
   * Step 4: Check persistence — anomaly must persist across multiple timesteps
   */
  checkPersistence(nodeId: string, residual: number): number {
    const isAnomalous = Math.abs(residual) > this.thresholds.residualWarning;
    const current = this.persistenceMap.get(nodeId) || 0;

    if (isAnomalous) {
      const newCount = current + 1;
      this.persistenceMap.set(nodeId, newCount);
      return newCount;
    } else {
      // Reset slowly (hysteresis)
      const newCount = Math.max(0, current - 0.5);
      this.persistenceMap.set(nodeId, newCount);
      return Math.floor(newCount);
    }
  }

  /**
   * Step 5: Cross-sensor agreement
   * Checks if multiple sensor types on the same node agree about an anomaly
   */
  checkSensorAgreement(node: SensorNode): {
    score: number;
    tiltContrib: number;
    vibContrib: number;
    dispContrib: number;
    crackContrib: number;
  } {
    const r = node.currentReading;
    
    // Normalize each sensor reading to [0, 1] anomaly scale
    const tiltContrib = Math.min(1, Math.abs(r.tilt) / this.thresholds.tiltCritical);
    const vibContrib = Math.min(1, r.vibration / this.thresholds.vibrationCritical);
    const dispContrib = Math.min(1, Math.abs(r.displacement) / this.thresholds.displacementCritical);
    const crackContrib = Math.min(1, r.crackWidth / this.thresholds.crackCritical);

    // Count how many sensors are above warning
    const sensors = [
      { val: Math.abs(r.tilt), thresh: this.thresholds.tiltWarning },
      { val: r.vibration, thresh: this.thresholds.vibrationWarning },
      { val: Math.abs(r.displacement), thresh: this.thresholds.displacementWarning },
      { val: r.crackWidth, thresh: this.thresholds.crackWarning },
    ];
    const aboveWarning = sensors.filter(s => s.val > s.thresh).length;
    const score = aboveWarning / sensors.length;

    return { score, tiltContrib, vibContrib, dispContrib, crackContrib };
  }

  /**
   * Step 6: Calculate risk score and classify
   */
  calculateRiskScore(
    residual: number,
    neighbourAgreement: number,
    persistence: number,
    sensorAgreement: number,
    hasFault: boolean
  ): { score: number; level: RiskLevel; isFalseAlarmCandidate: boolean } {
    // Weight factors
    const residualWeight = 0.35;
    const neighbourWeight = 0.25;
    const persistenceWeight = 0.20;
    const sensorWeight = 0.20;

    // Normalize residual to 0-100
    const residualScore = Math.min(100, (Math.abs(residual) / this.thresholds.residualCritical) * 100);

    // Persistence score
    const persistenceScore = Math.min(100, (persistence / this.thresholds.persistenceSteps) * 100);

    // Combine
    let score = residualScore * residualWeight +
                neighbourAgreement * 100 * neighbourWeight +
                persistenceScore * persistenceWeight +
                sensorAgreement * 100 * sensorWeight;

    // False alarm candidate: high residual but low consensus
    const isFalseAlarmCandidate = residualScore > 40 && 
                                   neighbourAgreement < this.thresholds.neighbourAgreementMin &&
                                   persistence < this.thresholds.persistenceSteps;

    // Reduce score for suspected false alarms
    if (isFalseAlarmCandidate) {
      score *= 0.4;
    }

    // Sensor fault: flag but don't over-escalate
    if (hasFault) {
      score = Math.min(score, 60); // Cap at Moderate for faulty sensors
    }

    score = Math.round(Math.min(100, Math.max(0, score)));

    let level: RiskLevel;
    if (score >= 80) level = 'Critical';
    else if (score >= 60) level = 'High';
    else if (score >= 40) level = 'Moderate';
    else if (score >= 20) level = 'Low';
    else level = 'Normal';

    return { score, level, isFalseAlarmCandidate };
  }

  /**
   * Main GARC analysis for a node
   */
  analyzeNode(
    node: SensorNode,
    zone: MineZone,
    allNodes: SensorNode[],
    intermediateResults: Map<string, { residual: number }>
  ): GARCResult {
    // Step 1: Expected deformation
    const expected = this.calculateExpectedDeformation(node, zone);

    // Step 2: Residual
    const observed = node.currentReading.displacement;
    const residual = this.calculateResidual(observed, expected);

    // Store for neighbour checks
    intermediateResults.set(node.id, { residual });

    // Step 3: Neighbour consensus
    const { agreement, agreeingNeighbours } = this.checkNeighbourConsensus(
      node.id, residual, allNodes, intermediateResults
    );

    // Step 4: Persistence
    const persistence = this.checkPersistence(node.id, residual);

    // Step 5: Sensor agreement
    const sensorCheck = this.checkSensorAgreement(node);

    // Step 6: Risk classification
    const { score, level, isFalseAlarmCandidate } = this.calculateRiskScore(
      residual, agreement, persistence, sensorCheck.score, node.hasFault
    );

    // Build explanation
    let explanation = '';
    if (level === 'Normal') {
      explanation = `Readings within expected parameters. Residual ${residual.toFixed(2)}mm is within normal range.`;
    } else if (isFalseAlarmCandidate) {
      explanation = `Elevated residual (${residual.toFixed(2)}mm) detected but not confirmed by neighbouring nodes. ` +
        `Persistence: ${persistence}/${this.thresholds.persistenceSteps} steps. Possible sensor noise or isolated event.`;
    } else {
      explanation = `Residual ${residual.toFixed(2)}mm exceeds threshold. ` +
        `${agreeingNeighbours.length} neighbour(s) show correlated anomaly. ` +
        `Persisted for ${persistence} step(s). ` +
        `Sensor agreement: ${(sensorCheck.score * 100).toFixed(0)}%. ` +
        `Risk: ${level} (${score}/100).`;
    }

    // Track residual history
    const history = this.prevResiduals.get(node.id) || [];
    history.push(residual);
    if (history.length > 20) history.shift();
    this.prevResiduals.set(node.id, history);

    return {
      nodeId: node.id,
      zoneId: zone.id,
      timestamp: node.currentReading.timestamp,
      expectedDeformation: Math.round(expected * 1000) / 1000,
      observedDeformation: Math.round(observed * 1000) / 1000,
      residual: Math.round(residual * 1000) / 1000,
      neighbourAgreement: Math.round(agreement * 1000) / 1000,
      agreeingNeighbours,
      persistenceCount: persistence,
      persistenceThreshold: this.thresholds.persistenceSteps,
      tiltContribution: Math.round(sensorCheck.tiltContrib * 1000) / 1000,
      vibrationContribution: Math.round(sensorCheck.vibContrib * 1000) / 1000,
      displacementContribution: Math.round(sensorCheck.dispContrib * 1000) / 1000,
      crackContribution: Math.round(sensorCheck.crackContrib * 1000) / 1000,
      sensorAgreementScore: Math.round(sensorCheck.score * 1000) / 1000,
      riskScore: score,
      riskLevel: level,
      explanation,
      isFalseAlarmCandidate,
    };
  }

  /**
   * Analyze all nodes and update zone risk levels
   */
  analyzeAll(
    nodes: SensorNode[],
    zones: MineZone[]
  ): { results: GARCResult[]; updatedZones: MineZone[] } {
    const intermediateResults = new Map<string, { residual: number }>();
    const results: GARCResult[] = [];

    // First pass: calculate residuals for all nodes
    for (const node of nodes) {
      if (!node.online) continue;
      const zone = zones.find(z => z.id === node.zoneId);
      if (!zone) continue;
      const expected = this.calculateExpectedDeformation(node, zone);
      const residual = this.calculateResidual(node.currentReading.displacement, expected);
      intermediateResults.set(node.id, { residual });
    }

    // Second pass: full analysis with neighbour info
    for (const node of nodes) {
      if (!node.online) continue;
      const zone = zones.find(z => z.id === node.zoneId);
      if (!zone) continue;
      const result = this.analyzeNode(node, zone, nodes, intermediateResults);
      results.push(result);
    }

    // Update zone risk levels (worst node in zone determines zone risk)
    const updatedZones = zones.map(zone => {
      const zoneResults = results.filter(r => r.zoneId === zone.id);
      if (zoneResults.length === 0) return zone;

      const maxResult = zoneResults.reduce((max, r) => r.riskScore > max.riskScore ? r : max, zoneResults[0]);
      return {
        ...zone,
        riskLevel: maxResult.riskLevel,
        riskScore: maxResult.riskScore,
      };
    });

    return { results, updatedZones };
  }
}
