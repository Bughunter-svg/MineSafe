import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { RISK_COLORS, RISK_BG_COLORS } from '@/data/mineData';
import { AlertTriangle, Map, Cpu, Activity } from 'lucide-react';
import { RiskLevel } from '@/types';

export default function DigitalTwin() {
  const { nodes, zones, garcResults, selectNode, selectedNodeId } = useAppStore();

  const getRiskColor = (level: RiskLevel) => RISK_COLORS[level] || '#22c55e';
  
  const isZoneElevated = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone && (zone.riskLevel === 'High' || zone.riskLevel === 'Critical');
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-full space-y-6 text-gray-200">


      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Map className="w-6 h-6 mr-3 text-blue-400" />
            Mine Digital Twin
          </h1>
          <p className="text-gray-400 mt-1">Live structural schematic and risk visualization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-[#1a2332] rounded-xl border border-gray-800 p-6 relative flex flex-col items-center overflow-hidden">
          <div className="w-full text-xs text-gray-500 mb-2 italic">
            Schematic representation — not a surveyed mine plan
          </div>
          
          <svg viewBox="0 0 800 500" className="w-full h-auto bg-[#0f1419] rounded-lg border border-gray-800" style={{ maxHeight: '600px' }}>
            <defs>
              <pattern id="tunnelPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 20 M 0 0 L 20 20" fill="none" stroke="#1f2937" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Depth Labels */}
            <g className="text-[10px] fill-gray-500">
              <text x="10" y="20">0m (Surface)</text>
              <line x1="10" y1="25" x2="790" y2="25" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
              
              <text x="10" y="150">50m</text>
              <line x1="10" y1="155" x2="790" y2="155" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
              
              <text x="10" y="300">100m</text>
              <line x1="10" y1="305" x2="790" y2="305" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />

              <text x="10" y="450">180m (Extraction Level)</text>
              <line x1="10" y1="455" x2="790" y2="455" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
            </g>

            {/* Tunnels (Paths) */}
            <g>
              {/* Vertical Shafts */}
              <rect x="180" y="25" width="40" height="430" fill="url(#tunnelPattern)" stroke="#374151" strokeWidth="2" />
              <rect x="380" y="25" width="40" height="430" fill="url(#tunnelPattern)" stroke="#374151" strokeWidth="2" />
              
              {/* Horizontal Drifts */}
              <rect x="40" y="110" width="400" height="20" fill="url(#tunnelPattern)" stroke="#374151" strokeWidth="2" />
              <rect x="40" y="170" width="400" height="20" fill="url(#tunnelPattern)" stroke="#374151" strokeWidth="2" />
              <rect x="40" y="250" width="400" height="20" fill="url(#tunnelPattern)" stroke="#374151" strokeWidth="2" />
              <rect x="40" y="310" width="400" height="20" fill="url(#tunnelPattern)" stroke="#374151" strokeWidth="2" />
            </g>

            {/* Zones */}
            {zones.map(zone => {
              const glowing = isZoneElevated(zone.id);
              const color = RISK_COLORS[zone.riskLevel];
              const bgColor = RISK_BG_COLORS[zone.riskLevel];
              
              return (
                <g key={`zone-${zone.id}`}>
                  <rect
                    x={zone.bounds.x}
                    y={zone.bounds.y}
                    width={zone.bounds.w}
                    height={zone.bounds.h}
                    fill={bgColor}
                    stroke={color}
                    strokeWidth={glowing ? 3 : 1}
                    rx="4"
                    className={glowing ? 'animate-pulse' : ''}
                  />
                  <text
                    x={zone.bounds.x + 5}
                    y={zone.bounds.y + 15}
                    fill={color}
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {zone.name}
                  </text>
                  <text
                    x={zone.bounds.x + 5}
                    y={zone.bounds.y + 30}
                    fill={color}
                    fontSize="10"
                  >
                    Risk: {zone.riskLevel}
                  </text>
                </g>
              );
            })}

            {/* Connections */}
            {nodes.map(node => (
              node.neighbours.map(nId => {
                const neighbour = nodes.find(n => n.id === nId);
                if (!neighbour) return null;
                if (node.id > neighbour.id) return null;
                return (
                  <line
                    key={`conn-${node.id}-${nId}`}
                    x1={node.x}
                    y1={node.y}
                    x2={neighbour.x}
                    y2={neighbour.y}
                    stroke="#4b5563"
                    strokeWidth="1.5"
                    strokeDasharray="5,5"
                  />
                );
              })
            ))}

            {/* Nodes */}
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              const garc = garcResults.find(g => g.nodeId === node.id);
              const nodeRisk = garc ? garc.riskLevel : 'Normal';
              const color = getRiskColor(nodeRisk);

              return (
                <g 
                  key={node.id} 
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => selectNode(node.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={isSelected ? 10 : 7}
                    fill={color}
                    stroke={isSelected ? '#fff' : '#1f2937'}
                    strokeWidth="2"
                    className="transition-all duration-300 hover:scale-125"
                  />
                  {isSelected && (
                    <circle
                      r="14"
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      className="animate-ping opacity-75"
                    />
                  )}
                  <text
                    x="12"
                    y="4"
                    fill="#9ca3af"
                    fontSize="10"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-6 right-6 bg-[#1a2332]/90 border border-gray-700 p-3 rounded-lg backdrop-blur-sm shadow-xl flex gap-6 text-xs">
            <div>
              <div className="font-semibold text-gray-300 mb-2">Risk Levels</div>
              {Object.entries(RISK_COLORS).map(([level, color]) => (
                <div key={level} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-gray-400">{level}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold text-gray-300 mb-2">Features</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-3 border border-gray-600 bg-gray-800" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #374151 2px, #374151 4px)' }}></div>
                <span className="text-gray-400">Tunnel</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-3 bg-blue-900/30 border border-blue-500 rounded-sm"></div>
                <span className="text-gray-400">Zone</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 border-t border-dashed border-gray-500"></div>
                <span className="text-gray-400">Mesh Link</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="bg-[#1e2a3a] rounded-xl border border-gray-800 p-5 flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Cpu className="w-5 h-5 mr-2 text-blue-400" />
            Node Details
          </h2>
          
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-gray-800 pb-3">
                <div>
                  <div className="text-xl font-bold text-white">{selectedNode.name}</div>
                  <div className="text-sm text-gray-400">ID: {selectedNode.id} • Zone: {selectedNode.zoneId}</div>
                </div>
                <div 
                  className="px-2 py-1 rounded text-xs font-bold"
                  style={{ 
                    backgroundColor: RISK_BG_COLORS[garcResults.find(g => g.nodeId === selectedNode.id)?.riskLevel || 'Normal'],
                    color: RISK_COLORS[garcResults.find(g => g.nodeId === selectedNode.id)?.riskLevel || 'Normal']
                  }}
                >
                  {garcResults.find(g => g.nodeId === selectedNode.id)?.riskLevel || 'Normal'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">Displacement</div>
                  <div className="text-lg font-mono text-white">{selectedNode.currentReading.displacement.toFixed(2)} <span className="text-xs text-gray-500">mm</span></div>
                </div>
                <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">Tilt</div>
                  <div className="text-lg font-mono text-white">{selectedNode.currentReading.tilt.toFixed(2)} <span className="text-xs text-gray-500">°</span></div>
                </div>
                <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">Vibration</div>
                  <div className="text-lg font-mono text-white">{selectedNode.currentReading.vibration.toFixed(2)} <span className="text-xs text-gray-500">mm/s</span></div>
                </div>
                <div className="bg-[#1a2332] p-3 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">Crack Width</div>
                  <div className="text-lg font-mono text-white">{selectedNode.currentReading.crackWidth.toFixed(2)} <span className="text-xs text-gray-500">mm</span></div>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-800 pt-3 text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Battery</span>
                  <span className={selectedNode.currentReading.battery < 20 ? 'text-red-400' : 'text-green-400'}>
                    {selectedNode.currentReading.battery.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Signal</span>
                  <span className="text-blue-400">{selectedNode.currentReading.signalStrength.toFixed(0)} dBm</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Status</span>
                  <span className={selectedNode.online ? 'text-green-400' : 'text-red-400'}>
                    {selectedNode.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p>Click a node on the schematic to view real-time telemetry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
