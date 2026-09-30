// ===== Simulation Engine =====
// Generates deterministic, physically-plausible sensor data for the MineSafe AI digital twin.
// ALL DATA IS SIMULATED — not connected to physical sensors.

import { SensorNode, SensorReading, ScenarioEvent, MineZone, GatewayStatus } from '@/types';
import { MINE_CONFIG } from '@/data/mineData';

// Seeded pseudo-random number generator (Mulberry32)
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SimulationEngine {
  private rng: () => number;
  private seed: number;
  private activeEvents: Map<string, { event: ScenarioEvent; startTime: number; progress: number }> = new Map();
  private driftAccumulators: Map<string, number> = new Map();
  private persistenceCounters: Map<string, number> = new Map();

  constructor(seed: number = 42) {
    this.seed = seed;
    this.rng = mulberry32(seed);
  }

  reset(seed?: number) {
    this.seed = seed ?? this.seed;
    this.rng = mulberry32(this.seed);
    this.activeEvents.clear();
    this.driftAccumulators.clear();
    this.persistenceCounters.clear();
  }

  // Generate gaussian noise using Box-Muller transform
  private gaussian(mean: number = 0, std: number = 1): number {
    const u1 = this.rng();
    const u2 = this.rng();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }

  // Process scenario events at current simulation time
  processEvents(events: ScenarioEvent[], simTime: number): void {
    for (const event of events) {
      const key = `${event.type}_${event.nodeIds.join('_')}_${event.time}`;
      if (simTime >= event.time && simTime <= event.time + event.duration) {
        const progress = (simTime - event.time) / event.duration;
        this.activeEvents.set(key, { event, startTime: event.time, progress });
      } else {
        this.activeEvents.delete(key);
      }
    }
  }

  // Get combined event effects for a specific node
  private getEventEffects(nodeId: string): {
    subsidenceMag: number;
    tiltMag: number;
    vibrationMag: number;
    crackMag: number;
    isDrifting: boolean;
    driftMag: number;
    isSpike: boolean;
    spikeMag: number;
    isFailed: boolean;
    hasSensorFault: boolean;
    packetLossRate: number;
    isRecovering: boolean;
    recoveryProgress: number;
  } {
    const effects = {
      subsidenceMag: 0, tiltMag: 0, vibrationMag: 0, crackMag: 0,
      isDrifting: false, driftMag: 0, isSpike: false, spikeMag: 0,
      isFailed: false, hasSensorFault: false, packetLossRate: 0,
      isRecovering: false, recoveryProgress: 0,
    };

    for (const [, { event, progress }] of this.activeEvents) {
      if (!event.nodeIds.includes(nodeId) && event.nodeIds.length > 0) continue;

      // Smooth envelope: ramp up, sustain, ramp down
      const envelope = progress < 0.15 
        ? progress / 0.15 
        : progress > 0.85 
          ? (1 - progress) / 0.15 
          : 1.0;

      switch (event.type) {
        case 'subsidence':
          effects.subsidenceMag = Math.max(effects.subsidenceMag, event.magnitude * envelope);
          break;
        case 'tilt':
          effects.tiltMag = Math.max(effects.tiltMag, event.magnitude * envelope);
          break;
        case 'vibration':
          effects.vibrationMag = Math.max(effects.vibrationMag, event.magnitude * envelope);
          break;
        case 'crack':
          effects.crackMag = Math.max(effects.crackMag, event.magnitude * envelope);
          break;
        case 'drift':
          effects.isDrifting = true;
          effects.driftMag = event.magnitude * progress; // drift accumulates
          break;
        case 'spike':
          effects.isSpike = true;
          effects.spikeMag = event.magnitude;
          break;
        case 'node_failure':
          effects.isFailed = true;
          break;
        case 'sensor_fault':
          effects.hasSensorFault = true;
          break;
        case 'packet_loss':
          effects.packetLossRate = event.magnitude;
          break;
        case 'recovery':
          effects.isRecovering = true;
          effects.recoveryProgress = progress;
          break;
        case 'gateway_disconnect':
          // Handled at gateway level
          break;
      }
    }
    return effects;
  }

  // Check if gateway is disconnected
  isGatewayDisconnected(): boolean {
    for (const [, { event }] of this.activeEvents) {
      if (event.type === 'gateway_disconnect') return true;
    }
    return false;
  }

  // Generate a sensor reading for a specific node
  generateReading(node: SensorNode, simTime: number): SensorReading & { online: boolean; hasFault: boolean; faultType: string | null } {
    const effects = this.getEventEffects(node.id);

    // Node failure
    if (effects.isFailed) {
      return {
        timestamp: simTime,
        tilt: 0, vibration: 0, displacement: 0, crackWidth: 0,
        battery: 0, signalStrength: -120, temperature: 0,
        online: false, hasFault: true, faultType: 'Node offline — power failure',
      };
    }

    // Packet loss — might not deliver reading
    if (effects.packetLossRate > 0 && this.rng() < effects.packetLossRate) {
      return {
        ...node.currentReading,
        timestamp: simTime,
        online: true, hasFault: false, faultType: null,
      };
    }

    // Base noise parameters
    const tiltNoise = this.gaussian(0, 0.02);
    const vibNoise = Math.abs(this.gaussian(0, 0.1));
    const dispNoise = this.gaussian(0, 0.15);
    const crackNoise = Math.abs(this.gaussian(0, 0.02));

    // Expected deformation baseline from geometry
    const depthFactor = node.depth / MINE_CONFIG.extractionDepth;
    const baseExpectedDisp = MINE_CONFIG.maxExpectedSubsidence * MINE_CONFIG.extractionRatio * depthFactor * 0.1;

    // Apply event effects
    let tilt = node.currentReading.tilt * 0.95 + // slight smoothing
      (0.05 + tiltNoise + effects.tiltMag * 1.2);

    let vibration = 0.15 + vibNoise + effects.vibrationMag * 8.0;
    
    let displacement = baseExpectedDisp + dispNoise + effects.subsidenceMag * MINE_CONFIG.maxExpectedSubsidence * 0.8;

    let crackWidth = 0.05 + crackNoise + effects.crackMag * 5.0;

    // Drift effect
    if (effects.isDrifting) {
      const driftKey = `drift_${node.id}`;
      const currentDrift = (this.driftAccumulators.get(driftKey) || 0) + effects.driftMag * 0.1;
      this.driftAccumulators.set(driftKey, currentDrift);
      displacement += currentDrift;
      // Also add extra noise for drifting sensor
      displacement += this.gaussian(0, 0.5);
    }

    // Spike effect
    if (effects.isSpike) {
      displacement += effects.spikeMag * 25;
    }

    // Recovery: gradually return to normal
    if (effects.isRecovering) {
      const dampFactor = 1 - effects.recoveryProgress * 0.8;
      tilt *= dampFactor;
      vibration *= dampFactor;
      displacement = baseExpectedDisp + dispNoise + (displacement - baseExpectedDisp) * dampFactor;
      crackWidth *= dampFactor;
    }

    // Sensor fault: add erratic readings to tilt
    let hasFault = false;
    let faultType: string | null = null;
    if (effects.hasSensorFault) {
      tilt += this.gaussian(0, 2.0); // wildly erratic
      hasFault = true;
      faultType = 'Tilt sensor malfunction — erratic readings';
    }

    // Clamp to physically plausible ranges
    tilt = Math.max(-5, Math.min(5, tilt));
    vibration = Math.max(0, Math.min(20, vibration));
    displacement = Math.max(-5, Math.min(50, displacement));
    crackWidth = Math.max(0, Math.min(15, crackWidth));

    // Battery slowly drains (very slow)
    const batteryDrain = this.rng() * 0.01;
    const battery = Math.max(0, node.currentReading.battery - batteryDrain);

    // Signal strength with minor fluctuation
    const signalStrength = node.currentReading.signalStrength + this.gaussian(0, 2);

    // Temperature with slight drift
    const temperature = node.currentReading.temperature + this.gaussian(0, 0.1);

    return {
      timestamp: simTime,
      tilt: Math.round(tilt * 1000) / 1000,
      vibration: Math.round(vibration * 1000) / 1000,
      displacement: Math.round(displacement * 1000) / 1000,
      crackWidth: Math.round(crackWidth * 1000) / 1000,
      battery: Math.round(battery * 10) / 10,
      signalStrength: Math.round(signalStrength),
      temperature: Math.round(temperature * 10) / 10,
      online: true,
      hasFault,
      faultType,
    };
  }

  // Generate gateway status
  generateGatewayStatus(nodes: SensorNode[], simTime: number): GatewayStatus {
    const isDisconnected = this.isGatewayDisconnected();
    const onlineNodes = nodes.filter(n => n.online).length;

    // Count buffered messages during disconnect
    let bufferSize = 0;
    if (isDisconnected) {
      bufferSize = Math.floor(this.rng() * 50 + 10);
    }

    return {
      online: !isDisconnected,
      lastHeartbeat: isDisconnected ? simTime - 60000 : simTime,
      nodesConnected: isDisconnected ? 0 : onlineNodes,
      packetLoss: isDisconnected ? 100 : Math.round(this.rng() * 5 * 10) / 10,
      bufferSize,
      cpuUsage: Math.round((30 + this.rng() * 25) * 10) / 10,
      memoryUsage: Math.round((40 + this.rng() * 20) * 10) / 10,
      uptime: Math.max(0, simTime - nodes[0]?.currentReading?.timestamp || 0) / 1000,
      mqttConnected: !isDisconnected,
      cellularConnected: !isDisconnected && this.rng() > 0.05,
    };
  }
}
