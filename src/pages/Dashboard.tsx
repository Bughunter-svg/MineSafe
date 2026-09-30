import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, Radio, Server,
  Clock, ShieldAlert, Maximize2, Route
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RISK_COLORS } from '@/data/mineData';
import { CompactDisplacementTrend } from '@/components/DeformationCharts';

const Dashboard: React.FC = () => {
  const { nodes, zones, alerts, gateway, simulation, thresholds, selectNode } = useAppStore();

  const totalNodes = nodes?.length || 0;
  const onlineNodes = nodes?.filter(n => n.online).length || 0;

  const worstRisk = useMemo(() => {
    if (!zones || zones.length === 0) return 'Normal';
    const riskOrder = ['Critical', 'High', 'Moderate', 'Low', 'Normal'];
    const activeRisk = zones.map(z => z.riskLevel).sort((a, b) => riskOrder.indexOf(a) - riskOrder.indexOf(b))[0];
    return activeRisk || 'Normal';
  }, [zones]);

  const maxDisplacement = useMemo(() => {
    if (!nodes || nodes.length === 0) return 0;
    return Math.max(0, ...nodes.map(n => n.currentReading?.displacement || 0));
  }, [nodes]);

  const activeAlerts = alerts?.filter(a => !a.acknowledged).length || 0;

  const latestUpdate = useMemo(() => {
    if (!nodes || nodes.length === 0) return '--:--:--';
    const timestamps = nodes.map(n => n.lastSeen || 0);
    return timestamps.length ? new Date(Math.max(...timestamps)).toLocaleTimeString() : '--:--:--';
  }, [nodes]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0f1419] text-gray-200 overflow-hidden">

      <div className="p-4 flex-1 overflow-y-auto grid grid-cols-12 gap-4">
        {/* Metric Cards Row */}
        <div className="col-span-12 grid grid-cols-6 gap-4">
          <MetricCard icon={<Radio size={20}/>} label="Total Nodes" value={`${onlineNodes}/${totalNodes} Online`} />
          <MetricCard icon={<ShieldAlert size={20}/>} label="Current Mine Risk" value={worstRisk} valueColor={RISK_COLORS[worstRisk]} />
          <MetricCard icon={<Maximize2 size={20}/>} label="Max Displacement" value={`${maxDisplacement.toFixed(2)} mm`} />
          <MetricCard icon={<AlertTriangle size={20}/>} label="Active Alerts" value={activeAlerts.toString()} valueColor={activeAlerts > 0 ? '#ef4444' : '#10b981'} />
          <MetricCard icon={<Server size={20}/>} label="Gateway Status" value={gateway?.online ? 'ONLINE' : 'OFFLINE'} valueColor={gateway?.online ? '#10b981' : '#ef4444'} />
          <MetricCard icon={<Clock size={20}/>} label="Latest Update" value={latestUpdate} />
        </div>

        {/* Map Section */}
        <div className="col-span-8 flex flex-col gap-4">
          <div className="bg-[#1a2332] rounded-lg border border-[#1e2a3a] flex flex-col min-h-[400px]">
            <div className="p-3 border-b border-[#1e2a3a] font-semibold flex items-center gap-2">
              <Route size={18} />
              Mine Topology Map
            </div>
            <div className="flex-1 relative">
              <MapContainer center={[23.795, 86.415]} zoom={15} style={{ height: '100%', width: '100%', background: '#0f1419' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  className="map-tiles-dark"
                />
                <style>{`
                  .map-tiles-dark {
                    filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
                  }
                `}</style>
                {nodes?.map(node => {
                  const zone = zones?.find(z => z.id === node.zoneId);
                  const color = RISK_COLORS[zone?.riskLevel || 'Normal'];
                  return (
                    <CircleMarker
                      key={node.id}
                      center={[node.lat, node.lng]}
                      radius={8}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}
                      eventHandlers={{ click: () => selectNode(node.id) }}
                    >
                      <Popup className="dark-popup">
                        <div className="text-gray-900 font-sans">
                          <div className="font-bold border-b pb-1 mb-1">{node.name}</div>
                          <div className="text-xs">
                            <div>Status: <span className="font-semibold">{node.online ? 'Online' : 'Offline'}</span></div>
                            <div>Zone: {zone?.name}</div>
                            <div>Risk: <span style={{color}} className="font-semibold">{zone?.riskLevel}</span></div>
                            <div className="mt-1">
                              Tilt: {node.currentReading?.tilt}°<br/>
                              Disp: {node.currentReading?.displacement}mm
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

        {/* Compact deformation trend with a path to the full live analysis view */}
        <div className="bg-[#1a2332] rounded-lg border border-[#1e2a3a] p-4">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Activity size={17} /> Deformation Trend</h2>
              <p className="mt-1 text-xs text-gray-500">Highest-displacement simulated nodes. Warning limit shown as a dashed line.</p>
            </div>
            <Link to="/monitoring" className="shrink-0 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20">
              Open analysis
            </Link>
          </div>
          <CompactDisplacementTrend nodes={nodes} thresholds={thresholds} />
        </div>
        </div>

        {/* Right Sidebar - Zones & Alerts */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="bg-[#1a2332] rounded-lg border border-[#1e2a3a] flex-1">
            <div className="p-3 border-b border-[#1e2a3a] font-semibold">Zone Risk Summary</div>
            <div className="p-3 flex flex-col gap-2">
              {zones?.map(zone => (
                <div key={zone.id} className="flex justify-between items-center p-2 bg-[#1e2a3a] rounded">
                  <span className="font-medium text-sm">{zone.name}</span>
                  <span 
                    className="text-xs px-2 py-1 rounded font-bold"
                    style={{ backgroundColor: `${RISK_COLORS[zone.riskLevel]}33`, color: RISK_COLORS[zone.riskLevel] }}
                  >
                    {zone.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1a2332] rounded-lg border border-[#1e2a3a] flex-1 flex flex-col">
            <div className="p-3 border-b border-[#1e2a3a] font-semibold">Recent Alerts</div>
            <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[250px] flex-1">
              {alerts?.slice(0, 5).map(alert => (
                <div key={alert.id} className="p-2 bg-[#1e2a3a] rounded border-l-4" style={{ borderColor: RISK_COLORS[alert.severity] || RISK_COLORS.High }}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    <span>{alert.nodeId}</span>
                  </div>
                  <div className="text-sm">{alert.message}</div>
                </div>
              ))}
              {(!alerts || alerts.length === 0) && <div className="text-sm text-gray-500 text-center py-4">No recent alerts</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#1a2332] border-t border-[#1e2a3a] p-2 px-4 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Activity size={14}/> {simulation?.scenarioId || 'Idle'}</span>
          <span>Elapsed: {Math.floor((simulation?.elapsedSeconds || 0) / 60)}m {Math.floor(simulation?.elapsedSeconds || 0) % 60}s</span>
        </div>
        <div>
          Speed: {simulation?.speed || 1}x
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, valueColor = '#fff' }: { icon: React.ReactNode, label: string, value: string, valueColor?: string }) => (
  <div className="bg-[#1a2332] rounded-lg border border-[#1e2a3a] p-4 flex flex-col justify-between">
    <div className="flex items-center gap-2 text-gray-400 text-sm mb-2 whitespace-nowrap">
      {icon}
      <span>{label}</span>
    </div>
    <div className="font-mono text-2xl font-bold" style={{ color: valueColor }}>
      {value}
    </div>
  </div>
);

export default Dashboard;
