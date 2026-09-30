import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Alert } from '@/types';
import { AlertTriangle, AlertCircle, Info, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Alerts = () => {
  const { alerts, acknowledgeAlert, selectNode } = useAppStore();
  const [filter, setFilter] = useState<'All' | 'Critical' | 'High' | 'Moderate' | 'Unacknowledged'>('All');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSelectNode = (nodeId?: string) => {
    if (nodeId) {
      selectNode(nodeId);
      // Optional: navigate to dashboard or node detail
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
      case 'moderate': return 'bg-amber-500/20 text-amber-500 border-amber-500/50';
      default: return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <ShieldAlert className="w-5 h-5" />;
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'moderate': return <AlertCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const safeAlerts = alerts || [];
  
  const filteredAlerts = safeAlerts.filter((alert: Alert) => {
    if (filter === 'All') return true;
    if (filter === 'Unacknowledged') return !alert.acknowledged;
    return alert.severity?.toLowerCase() === filter.toLowerCase();
  });

  const totalCount = safeAlerts.length;
  const unackCount = safeAlerts.filter((a: Alert) => !a.acknowledged).length;
  const criticalCount = safeAlerts.filter((a: Alert) => a.severity?.toLowerCase() === 'critical').length;
  const highCount = safeAlerts.filter((a: Alert) => a.severity?.toLowerCase() === 'high').length;

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-200 p-6 flex flex-col gap-6 font-sans">

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white tracking-wide">System Alerts</h1>
        <p className="text-gray-400 text-sm">Monitor and respond to structural and systemic warnings.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a2332] border border-gray-800 rounded-lg p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Alerts</p>
            <p className="text-2xl font-bold text-white">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
            <Info className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="bg-[#1a2332] border border-red-900/50 rounded-lg p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Critical</p>
            <p className="text-2xl font-bold text-white">{criticalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
        </div>
        <div className="bg-[#1a2332] border border-orange-900/50 rounded-lg p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-1">High Risk</p>
            <p className="text-2xl font-bold text-white">{highCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
        </div>
        <div className="bg-[#1a2332] border border-blue-900/50 rounded-lg p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Unacknowledged</p>
            <p className="text-2xl font-bold text-white">{unackCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['All', 'Critical', 'High', 'Moderate', 'Unacknowledged'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors border ${
              filter === f 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-[#1a2332] border-gray-700 text-gray-400 hover:text-white hover:bg-[#1e2a3a]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-[#1a2332] border border-gray-800 rounded-lg p-10 flex flex-col items-center justify-center text-center shadow-lg">
            <CheckCircle className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No alerts found</h3>
            <p className="text-gray-500">
              {filter === 'All' 
                ? 'Start a simulation scenario to generate alerts.' 
                : `No ${filter.toLowerCase()} alerts matching current filter.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert: Alert) => (
            <div 
              key={alert.id} 
              className={`bg-[#1e2a3a] border-l-4 rounded-r-lg p-5 shadow-lg flex flex-col gap-4 transition-colors ${!alert.acknowledged ? 'border-l-blue-500' : 'border-l-gray-600 opacity-75'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 ${getSeverityColor(alert.severity)}`}>
                    {getSeverityIcon(alert.severity)}
                    {alert.severity?.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  <button 
                    onClick={() => handleSelectNode(alert.nodeId)}
                    className="ml-2 text-blue-400 hover:text-blue-300 text-sm font-semibold underline decoration-blue-500/30 underline-offset-2"
                  >
                    {alert.zoneName || 'Zone'} / {alert.nodeName || alert.nodeId || 'Unknown Node'}
                  </button>
                </div>
                
                {!alert.acknowledged ? (
                  <button
                    onClick={() => acknowledgeAlert && acknowledgeAlert(alert.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Acknowledge
                  </button>
                ) : (
                  <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Acknowledged {alert.acknowledgedBy ? `by ${alert.acknowledgedBy}` : ''} {alert.acknowledgedAt ? `at ${new Date(alert.acknowledgedAt).toLocaleTimeString()}` : ''}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{alert.message}</h3>
                <p className="text-gray-400 text-sm">{alert.recommendedAction}</p>
              </div>
              
              {alert.evidence && (
                <div>
                  <button 
                    onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                    className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                  >
                    {expandedAlert === alert.id ? 'Hide Evidence ▲' : 'View Evidence ▼'}
                  </button>
                  {expandedAlert === alert.id && (
                    <div className="mt-2 bg-[#0f1419] p-3 rounded border border-gray-800 text-sm text-gray-300 font-mono whitespace-pre-wrap">
                      {alert.evidence}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
