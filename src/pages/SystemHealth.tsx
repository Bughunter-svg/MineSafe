import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SensorNode } from '@/types';
import { AlertTriangle, Server, Wifi, Activity, Battery, ActivitySquare, AlertCircle, ArrowUpCircle } from 'lucide-react';

const SystemHealth = () => {
  const { nodes, gateway, simulation } = useAppStore();

  const safeNodes = nodes || [];
  
  const getBatteryColor = (level: number) => {
    if (level > 50) return 'bg-emerald-500';
    if (level >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSignalColor = (signal: number) => {
    if (signal > -70) return 'text-emerald-500';
    if (signal >= -90) return 'text-yellow-500';
    return 'text-red-500';
  };

  const isGatewayOnline = gateway?.online ?? false;

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-200 p-6 flex flex-col gap-6 font-sans">


      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide mb-1">System Health</h1>
        <p className="text-gray-400 text-sm">Infrastructure diagnostics and network connectivity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gateway Card */}
        <div className="lg:col-span-1 bg-[#1e2a3a] border border-gray-700 rounded-lg p-6 shadow-xl flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-gray-700 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${isGatewayOnline ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-500'}`}>
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Main Gateway</h2>
                <span className="text-xs text-gray-400 font-mono">GW-001</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-bold uppercase flex items-center gap-2 ${isGatewayOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isGatewayOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              {isGatewayOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Uptime</p>
              <p className="text-sm font-medium text-white">{gateway?.uptime || 0}s</p>
            </div>
            <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Packet Loss</p>
              <p className={`text-sm font-bold ${(gateway?.packetLoss ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {gateway?.packetLoss ?? 0}%
              </p>
            </div>
            <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
                <ActivitySquare className="w-3 h-3" /> CPU Load
              </p>
              <p className="text-sm font-medium text-white">{gateway?.cpuUsage ?? 0}%</p>
            </div>
            <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
                <Server className="w-3 h-3" /> Memory
              </p>
              <p className="text-sm font-medium text-white">{gateway?.memoryUsage ?? 0}%</p>
            </div>
            <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">MQTT Link</p>
              <p className={`text-sm font-bold ${gateway?.mqttConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {gateway?.mqttConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Cellular Link</p>
              <p className={`text-sm font-bold ${gateway?.cellularConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {gateway?.cellularConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>

          <div className="bg-[#1a2332] border border-gray-800 rounded p-4 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Buffer Capacity</span>
              <span className="text-xs text-gray-300">{gateway?.bufferSize ?? 0} msgs</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, gateway?.bufferSize ?? 0)}%` }}
              ></div>
            </div>
            {(gateway?.packetLoss ?? 0) > 0 && (
              <p className="text-xs text-red-400 mt-3 flex items-center gap-1 font-medium bg-red-900/20 p-2 rounded border border-red-900/50">
                <AlertCircle className="w-3 h-3" /> Active packet loss simulation impacting telemetry stream.
              </p>
            )}
          </div>
        </div>

        {/* Nodes Table */}
        <div className="lg:col-span-2 bg-[#1e2a3a] border border-gray-700 rounded-lg p-6 shadow-xl flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4">Sensor Node Diagnostics</h2>
          
          <div className="overflow-x-auto flex-1 bg-[#0f1419] rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs text-gray-500 uppercase bg-[#1a2332] border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 font-bold">Node ID</th>
                  <th className="px-4 py-3 font-bold text-center">Status</th>
                  <th className="px-4 py-3 font-bold">Battery</th>
                  <th className="px-4 py-3 font-bold">Signal</th>
                  <th className="px-4 py-3 font-bold">Last Seen</th>
                  <th className="px-4 py-3 font-bold">Faults</th>
                </tr>
              </thead>
              <tbody>
                {safeNodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                      No nodes registered. Start simulation.
                    </td>
                  </tr>
                ) : (
                  safeNodes.map((node: SensorNode) => (
                    <tr key={node.id} className="border-b border-gray-800 hover:bg-[#1a2332]/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{node.name || node.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <div className={`w-2.5 h-2.5 rounded-full ${node.online ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} title={node.online ? 'online' : 'offline'}></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono w-8">{node.currentReading?.battery ?? 0}%</span>
                          <div className="w-full bg-gray-800 rounded-full h-1.5 flex-1">
                            <div 
                              className={`h-1.5 rounded-full transition-all ${getBatteryColor(node.currentReading?.battery ?? 0)}`}
                              style={{ width: `${node.currentReading?.battery ?? 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div className={`flex items-center gap-1 ${getSignalColor(node.currentReading?.signalStrength ?? -100)}`}>
                          <Wifi className="w-3 h-3" />
                          {node.currentReading?.signalStrength ?? -100} dBm
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {node.lastSeen ? new Date(node.lastSeen).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {node.hasFault && node.faultType ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-red-400 font-medium bg-red-900/20 px-2 py-0.5 rounded inline-block whitespace-nowrap">
                              {node.faultType}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-500/70">None</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemHealth;
