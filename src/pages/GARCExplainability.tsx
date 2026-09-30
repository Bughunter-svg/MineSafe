import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { RISK_COLORS, RISK_BG_COLORS } from '@/data/mineData';
import { AlertTriangle, ChevronDown, ChevronUp, Info, ShieldAlert, Activity, BarChart2 } from 'lucide-react';
import { RiskLevel, GARCResult } from '@/types';

export default function GARCExplainability() {
  const { garcResults, zones, nodes } = useAppStore();
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>(
    zones.reduce((acc, z) => ({ ...acc, [z.id]: true }), {})
  );

  const toggleZone = (zoneId: string) => {
    setExpandedZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  const getRiskColor = (level: RiskLevel) => RISK_COLORS[level] || '#22c55e';
  const getRiskBgColor = (level: RiskLevel) => RISK_BG_COLORS[level] || 'rgba(34, 197, 94, 0.15)';

  if (!garcResults || garcResults.length === 0) {
    return (
      <div className="flex flex-col h-full space-y-6 text-gray-200">

        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <Activity className="w-12 h-12 mb-3 opacity-20" />
          <p>Start a simulation to see GARC analysis</p>
        </div>
      </div>
    );
  }

  const resultsByZone = zones.map(zone => ({
    zone,
    results: garcResults.filter(r => r.zoneId === zone.id)
  })).filter(g => g.results.length > 0);

  const renderNodeCard = (result: GARCResult) => {
    const node = nodes.find(n => n.id === result.nodeId);
    const nodeName = node ? node.name : result.nodeId;
    const isFalseAlarm = result.isFalseAlarmCandidate;

    return (
      <div key={result.nodeId} className="bg-[#1a2332] rounded-xl border border-gray-800 p-5 flex flex-col mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              {nodeName}
              {isFalseAlarm && (
                <span className="ml-3 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-900/40 text-blue-400 border border-blue-800/50">
                  <Info className="w-3 h-3 mr-1" /> False Alarm Candidate
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-400">Node ID: {result.nodeId}</p>
          </div>
          <div className="px-3 py-1 rounded text-sm font-bold border" style={{ backgroundColor: getRiskBgColor(result.riskLevel), color: getRiskColor(result.riskLevel), borderColor: getRiskColor(result.riskLevel) }}>
            {result.riskLevel} Risk
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="bg-[#141b25] p-4 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Deformation Analysis
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Expected Deformation</span>
                  <span className="text-gray-300">{result.expectedDeformation.toFixed(3)} mm</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, result.expectedDeformation * 10)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Observed Deformation</span>
                  <span className="text-gray-300">{result.observedDeformation.toFixed(3)} mm</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, result.observedDeformation * 10)}%` }}></div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                <span className="text-xs text-gray-400">Calculated Residual</span>
                <span className={`text-sm font-bold ${result.residual > 0.5 ? 'text-red-400' : result.residual > 0.2 ? 'text-amber-400' : 'text-green-400'}`}>
                  {result.residual.toFixed(3)} mm
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#141b25] p-4 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Consensus & Persistence
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Neighbour Agreement</span>
                  <span className="text-gray-300">{(result.neighbourAgreement * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${result.neighbourAgreement * 100}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-500">Agreeing: {result.agreeingNeighbours.length > 0 ? result.agreeingNeighbours.join(', ') : 'None'}</p>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Persistence</span>
                  <span className="text-gray-300">{result.persistenceCount} / {result.persistenceThreshold} steps</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, (result.persistenceCount / result.persistenceThreshold) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#141b25] p-4 rounded-lg border border-gray-800 mb-4">
           <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
             <BarChart2 className="w-4 h-4 mr-2" />
             Sensor Cross-Validation Agreement Score: {(result.sensorAgreementScore * 100).toFixed(0)}%
           </h4>
           <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 mb-1">Displacement</span>
                 <div className="w-full bg-gray-800 rounded h-1.5 mb-1">
                   <div className="bg-emerald-500 h-1.5 rounded" style={{ width: `${result.displacementContribution * 100}%` }}></div>
                 </div>
                 <span className="text-xs text-gray-300">{(result.displacementContribution * 100).toFixed(0)}%</span>
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 mb-1">Tilt</span>
                 <div className="w-full bg-gray-800 rounded h-1.5 mb-1">
                   <div className="bg-sky-500 h-1.5 rounded" style={{ width: `${result.tiltContribution * 100}%` }}></div>
                 </div>
                 <span className="text-xs text-gray-300">{(result.tiltContribution * 100).toFixed(0)}%</span>
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 mb-1">Vibration</span>
                 <div className="w-full bg-gray-800 rounded h-1.5 mb-1">
                   <div className="bg-rose-500 h-1.5 rounded" style={{ width: `${result.vibrationContribution * 100}%` }}></div>
                 </div>
                 <span className="text-xs text-gray-300">{(result.vibrationContribution * 100).toFixed(0)}%</span>
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 mb-1">Crack Width</span>
                 <div className="w-full bg-gray-800 rounded h-1.5 mb-1">
                   <div className="bg-amber-500 h-1.5 rounded" style={{ width: `${result.crackContribution * 100}%` }}></div>
                 </div>
                 <span className="text-xs text-gray-300">{(result.crackContribution * 100).toFixed(0)}%</span>
              </div>
           </div>
        </div>

        <div className="bg-[#0f1419] p-4 rounded text-sm text-gray-300 border border-gray-800">
          <span className="font-semibold text-gray-400 mr-2">Explanation:</span>
          {result.explanation}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6 text-gray-200 overflow-y-auto">


      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <ShieldAlert className="w-6 h-6 mr-3 text-purple-400" />
          GARC Explainability
        </h1>
        <p className="text-gray-400 mt-2 max-w-3xl">
          <strong className="text-white">Geometry-Aware Residual Consensus (GARC)</strong> calculates expected ground deformation based on mine geometry, comparing it against observed multi-sensor readings. It validates anomalies against neighbouring nodes to eliminate false alarms and confirm true structural risks.
        </p>
        <div className="text-xs text-gray-500 mt-2 italic">
          Demonstration thresholds — not validated for mine safety operations
        </div>
      </div>

      <div className="space-y-4 pb-10">
        {resultsByZone.map(({ zone, results }) => (
          <div key={zone.id} className="bg-[#0f1419] rounded-xl border border-gray-800 overflow-hidden">
            <button
              onClick={() => toggleZone(zone.id)}
              className="w-full flex items-center justify-between p-4 bg-[#1a2332] hover:bg-[#1e2a3a] transition-colors"
            >
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: getRiskColor(zone.riskLevel) }}></div>
                <h2 className="text-lg font-bold text-white">{zone.name}</h2>
                <span className="ml-3 px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                  {results.length} Nodes
                </span>
              </div>
              {expandedZones[zone.id] ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </button>
            
            {expandedZones[zone.id] && (
              <div className="p-4 bg-[#0f1419]">
                {results.map(result => renderNodeCard(result))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
