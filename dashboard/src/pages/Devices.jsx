import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJSON } from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, Monitor, Server, Laptop, Activity, Eye } from 'lucide-react';

const Devices = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [deviceHealth, setDeviceHealth] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [compareList, setCompareList] = useState([]);
    const navigate = useNavigate();
    const { user } = useAuth();
    const role = user?.role || 'org_user';
    const isViewer = ['end_customer', 'org_user'].includes(role);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/dashboard/devices');
        if (data && data.devices) {
            setDevices(data.devices);
        }
        setLoading(false);
    };

    const handleViewDevice = async (fingerprint) => {
        setModalOpen(true);
        setSelectedDevice(null);
        setDeviceHealth(null);
        
        const [deviceData, healthData] = await Promise.all([
            fetchJSON(`/api/dashboard/device/${encodeURIComponent(fingerprint)}`),
            fetchJSON(`/api/dashboard/device/${encodeURIComponent(fingerprint)}/health`)
        ]);

        if (deviceData) {
            setSelectedDevice(deviceData);
        }
        if (healthData) {
            setDeviceHealth(healthData);
        }
    };

    const toggleCompare = (fingerprint) => {
        setCompareList(prev => {
            if (prev.includes(fingerprint)) {
                return prev.filter(f => f !== fingerprint);
            }
            if (prev.length >= 3) {
                alert('You can compare up to 3 devices at a time.');
                return prev;
            }
            return [...prev, fingerprint];
        });
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        const now = new Date();
        const diffSecs = Math.floor((now - date) / 1000);
        if (diffSecs < 60) return `${diffSecs} sec ago`;
        if (diffSecs < 3600) return `${Math.floor(diffSecs/60)} min ago`;
        if (diffSecs < 86400) return `${Math.floor(diffSecs/3600)} hr ago`;
        return `${Math.floor(diffSecs/86400)} days ago`;
    };

    const filteredDevices = devices.filter(d => 
        (d.hostname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.org_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.fingerprint || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full flex flex-col gap-6">
            
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Device Inventory ({devices.length})</h3>
                        {isViewer && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                                <Eye className="w-3 h-3" /> Viewer Access
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3 items-center w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="Search devices..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {compareList.length >= 2 && (
                            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
                                Compare ({compareList.length})
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading devices...</div>
                    ) : filteredDevices.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">No devices found.</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    {!isViewer && <th className="px-6 py-4">Select</th>}
                                    <th className="px-6 py-4">Hostname</th>
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Scans</th>
                                    <th className="px-6 py-4">Last Seen</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filteredDevices.map(device => (
                                    <tr key={device.fingerprint} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        {!isViewer && (
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-blue-500 border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                                                checked={compareList.includes(device.fingerprint)}
                                                onChange={() => toggleCompare(device.fingerprint)}
                                            />
                                        </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Monitor className="w-4 h-4 text-slate-400" />
                                                <strong className="text-slate-800 dark:text-slate-200">{device.hostname || 'Unknown Device'}</strong>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{device.org_name || '-'}</td>
                                        <td className="px-6 py-4">
                                            {device.online ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Offline
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">
                                                {device.scans_used} / {device.total_scans}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-xs">
                                            {timeAgo(device.last_seen)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => handleViewDevice(device.fingerprint)}
                                                className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Device Detail Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-blue-500" /> Device Details
                            </h2>
                            <div className="flex items-center gap-4">
                                {selectedDevice && (
                                    <button 
                                        onClick={() => navigate(`/device/${selectedDevice.device.fingerprint}/vitals`)}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 border border-blue-100 dark:border-blue-500/20"
                                    >
                                        <Activity className="w-4 h-4" /> Live Vitals
                                    </button>
                                )}
                                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            {!selectedDevice ? (
                                <div className="p-10 text-center text-slate-500">Loading device profile...</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Column 1 */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">System Information</h4>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Hostname</label>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedDevice.device.hostname || 'Unknown'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Organization</label>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedDevice.device.org_name || '-'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Fingerprint</label>
                                                <div className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 p-1.5 rounded text-slate-700 dark:text-slate-300 break-all">
                                                    {selectedDevice.device.fingerprint}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Column 2 */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Health & License</h4>
                                        
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 text-center">
                                                <div className={`text-4xl font-black mb-1 ${deviceHealth?.overall_grade === 'A' ? 'text-emerald-500' : deviceHealth?.overall_grade === 'F' ? 'text-red-500' : 'text-blue-500'}`}>
                                                    {deviceHealth?.overall_grade || '?'}
                                                </div>
                                                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Score: {deviceHealth?.overall_score || '-'}/100</div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                                                <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{selectedDevice.device.total_scans}</div>
                                                <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Total</div>
                                            </div>
                                            <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20 text-center">
                                                <div className="text-xl font-bold text-amber-600 dark:text-amber-500">{selectedDevice.device.scans_used}</div>
                                                <div className="text-[10px] font-semibold text-amber-600/70 dark:text-amber-500/70 uppercase mt-1">Used</div>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-500">{(selectedDevice.device.total_scans || 0) - (selectedDevice.device.scans_used || 0)}</div>
                                                <div className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-500/70 uppercase mt-1">Left</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default Devices;
