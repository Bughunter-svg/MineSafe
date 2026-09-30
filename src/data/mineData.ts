// ===== Mine Layout & Sensor Configuration =====
// Simulated mine panel based on typical Jharia/Raniganj underground coal mine parameters

import { SensorNode, MineZone, MineConfig, SimulationScenario, ThresholdConfig, RiskLevel } from '@/types';

export const MINE_CONFIG: MineConfig = {
  panelWidth: 150,         // meters
  panelLength: 300,        // meters
  extractionDepth: 180,    // meters below surface
  extractionRatio: 0.65,   // 65% extraction
  subsidenceAngle: 35,     // degrees - angle of draw
  maxExpectedSubsidence: 45, // mm demonstration value
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  residualWarning: 5.0,       // mm above expected
  residualCritical: 15.0,     // mm above expected
  neighbourAgreementMin: 0.4, // 40% of neighbours must agree
  persistenceSteps: 3,        // 3 consecutive abnormal readings
  tiltWarning: 0.3,           // degrees
  tiltCritical: 0.8,          // degrees
  vibrationWarning: 2.0,      // mm/s
  vibrationCritical: 5.0,     // mm/s
  displacementWarning: 8.0,   // mm
  displacementCritical: 20.0, // mm
  crackWarning: 1.0,          // mm
  crackCritical: 3.0,         // mm
  batteryWarning: 20,         // %
  signalWarning: -100,        // dBm
};

// Node positions in mine schematic coordinates and approximate lat/lng
// Coordinates centered around a typical coal mining region
const BASE_LAT = 23.795;  // Jharia coalfield approximate
const BASE_LNG = 86.415;

export const INITIAL_NODES: SensorNode[] = [
  // Zone A - Main Extraction Panel (6 nodes)
  {
    id: 'N01', name: 'Node A1', x: 80, y: 120, lat: BASE_LAT + 0.001, lng: BASE_LNG + 0.001,
    zoneId: 'ZA', depth: 175, neighbours: ['N02', 'N03', 'N04'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.05, vibration: 0.3, displacement: 1.2, crackWidth: 0.1, battery: 92, signalStrength: -65, temperature: 28.5 },
    history: []
  },
  {
    id: 'N02', name: 'Node A2', x: 160, y: 120, lat: BASE_LAT + 0.001, lng: BASE_LNG + 0.002,
    zoneId: 'ZA', depth: 178, neighbours: ['N01', 'N03', 'N05'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.03, vibration: 0.25, displacement: 0.8, crackWidth: 0.05, battery: 88, signalStrength: -70, temperature: 29.1 },
    history: []
  },
  {
    id: 'N03', name: 'Node A3', x: 120, y: 180, lat: BASE_LAT + 0.0005, lng: BASE_LNG + 0.0015,
    zoneId: 'ZA', depth: 180, neighbours: ['N01', 'N02', 'N06'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.04, vibration: 0.28, displacement: 1.0, crackWidth: 0.08, battery: 95, signalStrength: -60, temperature: 28.8 },
    history: []
  },
  // Zone B - Adjacent Panel (4 nodes)
  {
    id: 'N04', name: 'Node B1', x: 80, y: 260, lat: BASE_LAT - 0.0005, lng: BASE_LNG + 0.001,
    zoneId: 'ZB', depth: 182, neighbours: ['N01', 'N05', 'N06'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.06, vibration: 0.35, displacement: 1.5, crackWidth: 0.12, battery: 85, signalStrength: -75, temperature: 29.5 },
    history: []
  },
  {
    id: 'N05', name: 'Node B2', x: 160, y: 260, lat: BASE_LAT - 0.0005, lng: BASE_LNG + 0.002,
    zoneId: 'ZB', depth: 180, neighbours: ['N02', 'N04', 'N07'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.04, vibration: 0.22, displacement: 0.9, crackWidth: 0.06, battery: 91, signalStrength: -68, temperature: 28.9 },
    history: []
  },
  {
    id: 'N06', name: 'Node B3', x: 120, y: 320, lat: BASE_LAT - 0.001, lng: BASE_LNG + 0.0015,
    zoneId: 'ZB', depth: 185, neighbours: ['N03', 'N04', 'N08'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.07, vibration: 0.4, displacement: 1.8, crackWidth: 0.15, battery: 78, signalStrength: -80, temperature: 30.1 },
    history: []
  },
  // Zone C - Pillar/Barrier area (3 nodes)
  {
    id: 'N07', name: 'Node C1', x: 240, y: 180, lat: BASE_LAT + 0.0005, lng: BASE_LNG + 0.003,
    zoneId: 'ZC', depth: 170, neighbours: ['N05', 'N08', 'N09'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.02, vibration: 0.15, displacement: 0.5, crackWidth: 0.03, battery: 97, signalStrength: -55, temperature: 27.8 },
    history: []
  },
  {
    id: 'N08', name: 'Node C2', x: 240, y: 260, lat: BASE_LAT - 0.0005, lng: BASE_LNG + 0.003,
    zoneId: 'ZC', depth: 172, neighbours: ['N06', 'N07', 'N10'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.03, vibration: 0.18, displacement: 0.6, crackWidth: 0.04, battery: 93, signalStrength: -62, temperature: 28.2 },
    history: []
  },
  // Zone D - Surface Monitoring (2 nodes)
  {
    id: 'N09', name: 'Node D1 (Surface)', x: 320, y: 120, lat: BASE_LAT + 0.002, lng: BASE_LNG + 0.004,
    zoneId: 'ZD', depth: 0, neighbours: ['N07', 'N10'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.01, vibration: 0.08, displacement: 0.2, crackWidth: 0.01, battery: 99, signalStrength: -45, temperature: 32.5 },
    history: []
  },
  {
    id: 'N10', name: 'Node D2 (Surface)', x: 320, y: 280, lat: BASE_LAT - 0.001, lng: BASE_LNG + 0.004,
    zoneId: 'ZD', depth: 0, neighbours: ['N08', 'N09'],
    online: true, hasFault: false, faultType: null, lastSeen: Date.now(),
    currentReading: { timestamp: Date.now(), tilt: 0.02, vibration: 0.1, displacement: 0.3, crackWidth: 0.02, battery: 96, signalStrength: -50, temperature: 33.1 },
    history: []
  },
];

export const INITIAL_ZONES: MineZone[] = [
  {
    id: 'ZA', name: 'Panel A - Main Extraction', panelId: 'P1',
    riskLevel: 'Normal', riskScore: 5,
    nodes: ['N01', 'N02', 'N03'],
    bounds: { x: 50, y: 90, w: 150, h: 120 },
    extractionDepth: 180, panelExtent: 65,
  },
  {
    id: 'ZB', name: 'Panel B - Adjacent', panelId: 'P2',
    riskLevel: 'Normal', riskScore: 8,
    nodes: ['N04', 'N05', 'N06'],
    bounds: { x: 50, y: 230, w: 150, h: 120 },
    extractionDepth: 182, panelExtent: 55,
  },
  {
    id: 'ZC', name: 'Barrier Pillar Zone', panelId: 'P3',
    riskLevel: 'Normal', riskScore: 3,
    nodes: ['N07', 'N08'],
    bounds: { x: 210, y: 150, w: 80, h: 140 },
    extractionDepth: 170, panelExtent: 30,
  },
  {
    id: 'ZD', name: 'Surface Monitoring', panelId: 'S1',
    riskLevel: 'Normal', riskScore: 2,
    nodes: ['N09', 'N10'],
    bounds: { x: 290, y: 90, w: 80, h: 220 },
    extractionDepth: 0, panelExtent: 0,
  },
];

// ===== Simulation Scenarios =====
export const SCENARIOS: SimulationScenario[] = [
  {
    id: 'normal',
    name: 'Normal Operations',
    description: 'Stable mine conditions with normal sensor noise. All readings within safe parameters.',
    duration: 300,
    events: []
  },
  {
    id: 'gradual_subsidence',
    name: 'Gradual Subsidence',
    description: 'Slow, progressive ground settlement over Panel A due to ongoing extraction. Displacement increases gradually across multiple nodes.',
    duration: 600,
    events: [
      { time: 60, type: 'subsidence', nodeIds: ['N01', 'N02', 'N03'], zoneId: 'ZA', magnitude: 0.3, duration: 480, description: 'Gradual ground settlement begins in Panel A' },
      { time: 180, type: 'subsidence', nodeIds: ['N04'], zoneId: 'ZB', magnitude: 0.15, duration: 360, description: 'Settlement propagates to adjacent Panel B' },
    ]
  },
  {
    id: 'rapid_movement',
    name: 'Rapid Localized Movement',
    description: 'Sudden localized ground movement near Node A1, with tilt and displacement spikes. Tests rapid detection capability.',
    duration: 300,
    events: [
      { time: 90, type: 'subsidence', nodeIds: ['N01'], magnitude: 0.8, duration: 60, description: 'Rapid ground movement at Node A1' },
      { time: 100, type: 'tilt', nodeIds: ['N01', 'N02'], magnitude: 0.7, duration: 50, description: 'Tilt increase at A1 and A2' },
      { time: 110, type: 'vibration', nodeIds: ['N01', 'N03'], magnitude: 0.6, duration: 40, description: 'Vibration spike at A1, A3' },
      { time: 150, type: 'crack', nodeIds: ['N01'], magnitude: 0.5, duration: 120, description: 'Crack width increasing at A1' },
    ]
  },
  {
    id: 'crack_growth',
    name: 'Increasing Crack Width',
    description: 'Progressive crack development in barrier pillar zone with correlated tilt changes.',
    duration: 450,
    events: [
      { time: 60, type: 'crack', nodeIds: ['N07', 'N08'], zoneId: 'ZC', magnitude: 0.4, duration: 360, description: 'Crack initiation in barrier pillar zone' },
      { time: 180, type: 'tilt', nodeIds: ['N07'], magnitude: 0.3, duration: 240, description: 'Tilt increase near crack zone' },
    ]
  },
  {
    id: 'sensor_drift',
    name: 'Sensor Drift / Noisy Sensor',
    description: 'Node B1 sensor drifts, producing noisy readings. GARC consensus should identify it as isolated/not confirmed by neighbours.',
    duration: 300,
    events: [
      { time: 30, type: 'drift', nodeIds: ['N04'], magnitude: 0.5, duration: 240, description: 'Sensor drift on Node B1 displacement sensor' },
      { time: 120, type: 'spike', nodeIds: ['N04'], magnitude: 0.9, duration: 5, description: 'Isolated spike from drifting sensor' },
    ]
  },
  {
    id: 'node_failure',
    name: 'Sensor/Node Failure',
    description: 'Node C1 loses power, then Node B3 has a sensor fault. Tests health monitoring and graceful degradation.',
    duration: 300,
    events: [
      { time: 60, type: 'node_failure', nodeIds: ['N07'], magnitude: 1.0, duration: 180, description: 'Node C1 goes offline (battery failure)' },
      { time: 120, type: 'sensor_fault', nodeIds: ['N06'], magnitude: 0.7, duration: 150, description: 'Tilt sensor fault on Node B3' },
    ]
  },
  {
    id: 'lora_loss',
    name: 'LoRa Packet Loss / Gateway Disconnect',
    description: 'Simulates intermittent LoRa connectivity then a gateway disconnection, showing buffering and recovery.',
    duration: 300,
    events: [
      { time: 30, type: 'packet_loss', nodeIds: ['N09', 'N10'], magnitude: 0.5, duration: 90, description: '50% packet loss on surface nodes' },
      { time: 150, type: 'gateway_disconnect', nodeIds: [], magnitude: 1.0, duration: 60, description: 'Gateway disconnected — local buffering active' },
      { time: 210, type: 'recovery', nodeIds: [], magnitude: 1.0, duration: 30, description: 'Gateway reconnects, buffer synchronization' },
    ]
  },
  {
    id: 'demo',
    name: '🎬 Guided Demo Scenario',
    description: 'A 2-3 minute guided scenario demonstrating the full system: normal → event → detection → alert → acknowledgement → summary.',
    duration: 180,
    events: [
      // Phase 1: All healthy (0-30s)
      // Phase 2: Localized ground movement begins (30-60s)
      { time: 30, type: 'subsidence', nodeIds: ['N01', 'N02'], zoneId: 'ZA', magnitude: 0.5, duration: 90, description: 'Localized ground movement begins near Node A1, A2' },
      { time: 35, type: 'tilt', nodeIds: ['N01', 'N02', 'N03'], magnitude: 0.4, duration: 85, description: 'Tilt changes across Panel A nodes' },
      // Phase 3: GARC detects (60-90s)
      { time: 50, type: 'vibration', nodeIds: ['N01'], magnitude: 0.6, duration: 40, description: 'Vibration increase at epicenter' },
      { time: 60, type: 'crack', nodeIds: ['N01'], magnitude: 0.3, duration: 60, description: 'Crack width increasing at A1' },
      // Phase 4: Escalation & Alert (90-120s)
      { time: 80, type: 'subsidence', nodeIds: ['N03', 'N04'], zoneId: 'ZB', magnitude: 0.3, duration: 40, description: 'Movement propagates to adjacent nodes' },
      // Phase 5: Recovery (120-180s)
      { time: 130, type: 'recovery', nodeIds: ['N01', 'N02', 'N03', 'N04'], magnitude: 0.8, duration: 50, description: 'Ground movement stabilizing' },
    ]
  },
];

export const RISK_COLORS: Record<RiskLevel, string> = {
  Normal: '#22c55e',
  Low: '#eab308',
  Moderate: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

export const RISK_BG_COLORS: Record<RiskLevel, string> = {
  Normal: 'rgba(34, 197, 94, 0.15)',
  Low: 'rgba(234, 179, 8, 0.15)',
  Moderate: 'rgba(245, 158, 11, 0.15)',
  High: 'rgba(249, 115, 22, 0.15)',
  Critical: 'rgba(239, 68, 68, 0.15)',
};
