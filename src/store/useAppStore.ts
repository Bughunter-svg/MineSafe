// ===== Main Application Store =====
// Zustand store managing simulation state, sensor data, GARC results, alerts, and settings

import { create } from 'zustand';
import {
  SensorNode, MineZone, GARCResult, Alert, GatewayStatus,
  SimulationState, ThresholdConfig, RiskLevel, PredictionResult,
  IncidentSummary,
} from '@/types';
import { INITIAL_NODES, INITIAL_ZONES, SCENARIOS, DEFAULT_THRESHOLDS } from '@/data/mineData';
import { SimulationEngine } from '@/engine/SimulationEngine';
import { GARCEngine } from '@/engine/GARCEngine';
import { PredictionEngine } from '@/engine/PredictionEngine';

const simEngine = new SimulationEngine(42);
const garcEngine = new GARCEngine(DEFAULT_THRESHOLDS);
const predEngine = new PredictionEngine();
// Bound simulation history so live charts can support the 15-minute view
// without allowing an unattended session to grow indefinitely.
const MAX_HISTORY_PER_NODE = 900;
const MAX_GARC_HISTORY = MAX_HISTORY_PER_NODE * INITIAL_NODES.length;

interface AppState {
  // Data
  nodes: SensorNode[];
  zones: MineZone[];
  garcResults: GARCResult[];
  /** Bounded, per-reading GARC history used by the live deformation charts. */
  garcHistory: GARCResult[];
  alerts: Alert[];
  gateway: GatewayStatus;
  predictions: Map<string, PredictionResult>;
  incidents: IncidentSummary[];

  // Simulation control
  simulation: SimulationState;
  thresholds: ThresholdConfig;
  selectedNodeId: string | null;
  selectedZoneId: string | null;

  // Demo
  demoTimeline: { time: number; event: string }[];

  // Actions
  startSimulation: (scenarioId: string) => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: number) => void;
  setSeed: (seed: number) => void;
  tick: () => void;
  selectNode: (nodeId: string | null) => void;
  selectZone: (zoneId: string | null) => void;
  acknowledgeAlert: (alertId: string, by?: string) => void;
  updateThresholds: (thresholds: Partial<ThresholdConfig>) => void;
  runDemo: () => void;
  getPrediction: (nodeId: string, forecastHours?: number) => PredictionResult | undefined;
}

const createInitialGateway = (): GatewayStatus => ({
  online: true,
  lastHeartbeat: Date.now(),
  nodesConnected: INITIAL_NODES.length,
  packetLoss: 1.2,
  bufferSize: 0,
  cpuUsage: 32.5,
  memoryUsage: 45.2,
  uptime: 0,
  mqttConnected: true,
  cellularConnected: true,
});

const deepCloneNodes = (nodes: SensorNode[]): SensorNode[] =>
  nodes.map(n => ({ ...n, currentReading: { ...n.currentReading }, history: [...n.history] }));

export const useAppStore = create<AppState>((set, get) => ({
  nodes: deepCloneNodes(INITIAL_NODES),
  zones: INITIAL_ZONES.map(z => ({ ...z })),
  garcResults: [],
  garcHistory: [],
  alerts: [],
  gateway: createInitialGateway(),
  predictions: new Map(),
  incidents: [],

  simulation: {
    running: false,
    paused: false,
    speed: 1,
    currentTime: Date.now(),
    startTime: Date.now(),
    elapsedSeconds: 0,
    scenarioId: null,
    demoMode: false,
    demoStep: 0,
    seed: 42,
  },

  thresholds: { ...DEFAULT_THRESHOLDS },
  selectedNodeId: null,
  selectedZoneId: null,
  demoTimeline: [],

  startSimulation: (scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    simEngine.reset(get().simulation.seed);
    garcEngine.reset();

    set({
      nodes: deepCloneNodes(INITIAL_NODES),
      zones: INITIAL_ZONES.map(z => ({ ...z })),
      garcResults: [],
      garcHistory: [],
      alerts: [],
      gateway: createInitialGateway(),
      predictions: new Map(),
      incidents: [],
      demoTimeline: [],
      simulation: {
        ...get().simulation,
        running: true,
        paused: false,
        currentTime: Date.now(),
        startTime: Date.now(),
        elapsedSeconds: 0,
        scenarioId,
        demoMode: scenarioId === 'demo',
        demoStep: 0,
      },
    });
  },

  pauseSimulation: () => {
    set(state => ({
      simulation: { ...state.simulation, paused: true },
    }));
  },

  resumeSimulation: () => {
    set(state => ({
      simulation: { ...state.simulation, paused: false },
    }));
  },

  resetSimulation: () => {
    simEngine.reset(get().simulation.seed);
    garcEngine.reset();
    set({
      nodes: deepCloneNodes(INITIAL_NODES),
      zones: INITIAL_ZONES.map(z => ({ ...z })),
      garcResults: [],
      garcHistory: [],
      alerts: [],
      gateway: createInitialGateway(),
      predictions: new Map(),
      incidents: [],
      demoTimeline: [],
      simulation: {
        running: false,
        paused: false,
        speed: get().simulation.speed,
        currentTime: Date.now(),
        startTime: Date.now(),
        elapsedSeconds: 0,
        scenarioId: null,
        demoMode: false,
        demoStep: 0,
        seed: get().simulation.seed,
      },
    });
  },

  setSpeed: (speed: number) => {
    set(state => ({ simulation: { ...state.simulation, speed } }));
  },

  setSeed: (seed: number) => {
    set(state => ({ simulation: { ...state.simulation, seed } }));
  },

  tick: () => {
    const state = get();
    if (!state.simulation.running || state.simulation.paused) return;

    const scenario = SCENARIOS.find(s => s.id === state.simulation.scenarioId);
    const elapsed = state.simulation.elapsedSeconds + state.simulation.speed;

    // Check if scenario ended
    if (scenario && elapsed > scenario.duration) {
      // Generate incident summary if demo
      if (state.simulation.demoMode) {
        const incident = generateIncidentSummary(state);
        set(s => ({
          incidents: [...s.incidents, incident],
          simulation: { ...s.simulation, running: false, demoStep: 7 },
        }));
      } else {
        set(s => ({ simulation: { ...s.simulation, running: false } }));
      }
      return;
    }

    const simTime = state.simulation.startTime + elapsed * 1000;

    // Process scenario events
    if (scenario) {
      simEngine.processEvents(scenario.events, elapsed);
    }

    // Generate new readings for each node
    const updatedNodes = state.nodes.map(node => {
      const result = simEngine.generateReading(node, simTime);
      const reading = {
        timestamp: result.timestamp,
        tilt: result.tilt,
        vibration: result.vibration,
        displacement: result.displacement,
        crackWidth: result.crackWidth,
        battery: result.battery,
        signalStrength: result.signalStrength,
        temperature: result.temperature,
      };

      // An offline node has no valid telemetry sample. Retaining the last known
      // point leaves an intentional chart gap rather than plotting a fabricated 0.
      const history = result.online ? [...node.history, reading] : [...node.history];
      if (history.length > MAX_HISTORY_PER_NODE) history.shift();

      return {
        ...node,
        online: result.online,
        hasFault: result.hasFault,
        faultType: result.faultType,
        lastSeen: result.online ? simTime : node.lastSeen,
        currentReading: reading,
        history,
      };
    });

    // Run GARC analysis
    const { results: garcResults, updatedZones } = garcEngine.analyzeAll(updatedNodes, state.zones);
    const garcHistory = [...state.garcHistory, ...garcResults];
    if (garcHistory.length > MAX_GARC_HISTORY) {
      garcHistory.splice(0, garcHistory.length - MAX_GARC_HISTORY);
    }

    // Generate alerts for high-risk results
    const newAlerts: Alert[] = [];
    for (const result of garcResults) {
      if (result.riskLevel === 'High' || result.riskLevel === 'Critical') {
        // Don't duplicate recent alerts for same node
        const recentAlert = state.alerts.find(
          a => a.nodeId === result.nodeId && simTime - a.timestamp < 30000
        );
        if (!recentAlert) {
          const node = updatedNodes.find(n => n.id === result.nodeId);
          const zone = updatedZones.find(z => z.id === result.zoneId);
          newAlerts.push({
            id: `alert_${result.nodeId}_${simTime}`,
            timestamp: simTime,
            severity: result.riskLevel,
            zoneId: result.zoneId,
            zoneName: zone?.name || result.zoneId,
            nodeId: result.nodeId,
            nodeName: node?.name || result.nodeId,
            message: `${result.riskLevel} risk detected at ${node?.name || result.nodeId}`,
            evidence: result.explanation,
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            recommendedAction: getRecommendedAction(result.riskLevel),
            garcResult: result,
          });
        }
      }
    }

    // Generate gateway status
    const gateway = simEngine.generateGatewayStatus(updatedNodes, simTime);

    // Update demo timeline
    const demoTimeline = [...state.demoTimeline];
    if (state.simulation.demoMode) {
      const step = getDemoStep(elapsed);
      if (step > state.simulation.demoStep) {
        demoTimeline.push({
          time: simTime,
          event: getDemoStepDescription(step),
        });
      }
    }

    // Recalculate forecasts from the same reading history on every tick so the
    // Prediction page advances in lockstep with the live simulation.
    const predictions = new Map(state.predictions);
    for (const node of updatedNodes) {
      predictions.set(node.id, predEngine.predict(node));
    }

    set({
      nodes: updatedNodes,
      zones: updatedZones,
      garcResults,
      garcHistory,
      alerts: [...state.alerts, ...newAlerts],
      gateway,
      predictions,
      demoTimeline,
      simulation: {
        ...state.simulation,
        currentTime: simTime,
        elapsedSeconds: elapsed,
        demoStep: state.simulation.demoMode ? getDemoStep(elapsed) : 0,
      },
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  selectZone: (zoneId) => set({ selectedZoneId: zoneId }),

  acknowledgeAlert: (alertId, by = 'Supervisor') => {
    set(state => ({
      alerts: state.alerts.map(a =>
        a.id === alertId
          ? { ...a, acknowledged: true, acknowledgedBy: by, acknowledgedAt: state.simulation.currentTime }
          : a
      ),
    }));
  },

  updateThresholds: (newThresholds) => {
    const updated = { ...get().thresholds, ...newThresholds };
    garcEngine.updateThresholds(updated);
    set({ thresholds: updated });
  },

  runDemo: () => {
    get().startSimulation('demo');
  },

  getPrediction: (nodeId, forecastHours = 24) => {
    const state = get();
    const node = state.nodes.find(item => item.id === nodeId);
    if (!node) return undefined;

    // The cached 24-hour result is refreshed with every tick. Other horizon
    // selections use the same existing prediction engine and node history.
    return forecastHours === 24
      ? state.predictions.get(nodeId) ?? predEngine.predict(node, forecastHours)
      : predEngine.predict(node, forecastHours);
  },
}));

// ===== Helper Functions =====

function getRecommendedAction(level: RiskLevel): string {
  switch (level) {
    case 'Critical':
      return 'IMMEDIATE: Evacuate affected zone. Deploy inspection team. Suspend extraction operations in the panel. Contact mine safety officer.';
    case 'High':
      return 'URGENT: Dispatch inspection team to affected zone within 1 hour. Increase monitoring frequency. Prepare evacuation plan. Notify mine manager.';
    case 'Moderate':
      return 'Monitor closely. Schedule inspection within 4 hours. Review GARC evidence. Compare with satellite data if available.';
    case 'Low':
      return 'Continue monitoring. Log observation. Review at next shift briefing.';
    default:
      return 'No action required. Normal operations.';
  }
}

function getDemoStep(elapsed: number): number {
  if (elapsed < 10) return 1;    // All healthy
  if (elapsed < 40) return 2;    // Event begins
  if (elapsed < 70) return 3;    // Sensors changing
  if (elapsed < 100) return 4;   // GARC calculates
  if (elapsed < 130) return 5;   // Risk escalates
  if (elapsed < 160) return 6;   // Alert + acknowledge
  return 7;                       // Summary
}

function getDemoStepDescription(step: number): string {
  switch (step) {
    case 1: return '✅ All nodes healthy — mine zone normal';
    case 2: return '🔄 Localized ground movement event introduced';
    case 3: return '📊 Displacement and tilt changing across nearby nodes';
    case 4: return '🧮 GARC calculating residuals and neighbour consensus';
    case 5: return '⚠️ Zone risk escalated — explainable alert generated';
    case 6: return '👤 Supervisor acknowledges alert — inspection recommended';
    case 7: return '📋 Incident summary generated';
    default: return '';
  }
}

function generateIncidentSummary(state: AppState): IncidentSummary {
  const affectedNodeIds = new Set<string>();
  const affectedZoneIds = new Set<string>();
  let peakDisplacement = 0;
  let peakRisk: RiskLevel = 'Normal';
  const riskScores: { [key in RiskLevel]: number } = { Normal: 0, Low: 1, Moderate: 2, High: 3, Critical: 4 };

  for (const result of state.garcResults) {
    if (result.riskScore > 20) {
      affectedNodeIds.add(result.nodeId);
      affectedZoneIds.add(result.zoneId);
      if (result.observedDeformation > peakDisplacement) {
        peakDisplacement = result.observedDeformation;
      }
      if (riskScores[result.riskLevel] > riskScores[peakRisk]) {
        peakRisk = result.riskLevel;
      }
    }
  }

  return {
    id: `incident_${Date.now()}`,
    startTime: state.simulation.startTime,
    endTime: state.simulation.currentTime,
    affectedNodes: Array.from(affectedNodeIds),
    affectedZones: Array.from(affectedZoneIds),
    peakDisplacement: Math.round(peakDisplacement * 100) / 100,
    peakRiskLevel: peakRisk,
    riskProgression: state.demoTimeline.map((t, i) => ({
      time: t.time,
      level: i < 2 ? 'Normal' as RiskLevel : i < 4 ? 'Moderate' as RiskLevel : 'High' as RiskLevel,
      score: i * 15,
    })),
    alertIds: state.alerts.map(a => a.id),
    timeline: state.demoTimeline,
    resolved: true,
  };
}
