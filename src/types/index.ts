// ===== Core Types for MineSafe AI Digital Twin =====

export type RiskLevel = 'Normal' | 'Low' | 'Moderate' | 'High' | 'Critical';

export interface SensorReading {
  timestamp: number;
  tilt: number;           // degrees
  vibration: number;      // mm/s (peak velocity)
  displacement: number;   // mm (relative)
  crackWidth: number;     // mm
  battery: number;        // percentage 0-100
  signalStrength: number; // dBm (-120 to 0)
  temperature: number;    // °C
}

export interface SensorNode {
  id: string;
  name: string;
  x: number;              // mine schematic x
  y: number;              // mine schematic y
  lat: number;            // map latitude
  lng: number;            // map longitude
  zoneId: string;
  depth: number;          // meters below surface
  neighbours: string[];   // node IDs
  online: boolean;
  hasFault: boolean;
  faultType: string | null;
  lastSeen: number;
  currentReading: SensorReading;
  history: SensorReading[];
}

export interface MineZone {
  id: string;
  name: string;
  panelId: string;
  riskLevel: RiskLevel;
  riskScore: number;      // 0-100
  nodes: string[];        // node IDs
  bounds: { x: number; y: number; w: number; h: number };
  extractionDepth: number;
  panelExtent: number;    // percentage extracted
}

export interface GARCResult {
  nodeId: string;
  zoneId: string;
  timestamp: number;
  expectedDeformation: number;
  observedDeformation: number;
  residual: number;
  neighbourAgreement: number;     // 0-1 fraction of neighbors agreeing
  agreeingNeighbours: string[];
  persistenceCount: number;       // consecutive anomalous steps
  persistenceThreshold: number;
  tiltContribution: number;
  vibrationContribution: number;
  displacementContribution: number;
  crackContribution: number;
  sensorAgreementScore: number;   // 0-1 cross-sensor agreement
  riskScore: number;
  riskLevel: RiskLevel;
  explanation: string;
  isFalseAlarmCandidate: boolean;
}

export interface Alert {
  id: string;
  timestamp: number;
  severity: RiskLevel;
  zoneId: string;
  zoneName: string;
  nodeId: string;
  nodeName: string;
  message: string;
  evidence: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: number | null;
  recommendedAction: string;
  garcResult?: GARCResult;
}

export interface GatewayStatus {
  online: boolean;
  lastHeartbeat: number;
  nodesConnected: number;
  packetLoss: number;       // percentage
  bufferSize: number;       // buffered messages
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;           // seconds
  mqttConnected: boolean;
  cellularConnected: boolean;
}

export interface MineConfig {
  panelWidth: number;        // meters
  panelLength: number;       // meters
  extractionDepth: number;   // meters
  extractionRatio: number;   // 0-1
  subsidenceAngle: number;   // degrees
  maxExpectedSubsidence: number; // mm
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  duration: number;          // seconds of simulation time
  events: ScenarioEvent[];
}

export interface ScenarioEvent {
  time: number;              // seconds into scenario
  type: 'subsidence' | 'crack' | 'vibration' | 'tilt' | 'sensor_fault' | 
        'node_failure' | 'packet_loss' | 'gateway_disconnect' | 'recovery' |
        'drift' | 'spike';
  nodeIds: string[];
  zoneId?: string;
  magnitude: number;         // 0-1 normalized intensity
  duration: number;          // seconds
  description: string;
}

export interface SimulationState {
  running: boolean;
  paused: boolean;
  speed: number;             // 1x, 2x, 5x, 10x
  currentTime: number;       // simulation timestamp
  startTime: number;
  elapsedSeconds: number;
  scenarioId: string | null;
  demoMode: boolean;
  demoStep: number;
  seed: number;
}

export interface ThresholdConfig {
  residualWarning: number;
  residualCritical: number;
  neighbourAgreementMin: number;
  persistenceSteps: number;
  tiltWarning: number;      // degrees
  tiltCritical: number;
  vibrationWarning: number;  // mm/s
  vibrationCritical: number;
  displacementWarning: number; // mm
  displacementCritical: number;
  crackWarning: number;       // mm
  crackCritical: number;
  batteryWarning: number;     // percentage
  signalWarning: number;      // dBm
}

export interface PredictionResult {
  nodeId: string;
  currentDisplacement: number;
  forecastHorizon: number;    // hours
  predictedValues: { time: number; value: number; lower: number; upper: number }[];
  trend: 'stable' | 'increasing' | 'decreasing' | 'accelerating';
  confidence: number;
  modelNote: string;
}

export interface IncidentSummary {
  id: string;
  startTime: number;
  endTime: number;
  affectedNodes: string[];
  affectedZones: string[];
  peakDisplacement: number;
  peakRiskLevel: RiskLevel;
  riskProgression: { time: number; level: RiskLevel; score: number }[];
  alertIds: string[];
  timeline: { time: number; event: string }[];
  resolved: boolean;
}
