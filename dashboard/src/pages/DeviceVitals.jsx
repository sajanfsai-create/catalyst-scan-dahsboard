import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchJSON } from '../api';
import { ArrowLeft, Cpu, HardDrive, AlertTriangle, Activity, Thermometer, Box } from 'lucide-react';

const DeviceVitals = () => {
    const { fingerprint } = useParams();
    const navigate = useNavigate();
    
    const [vitalsData, setVitalsData] = useState([]);
    const [latestVitals, setLatestVitals] = useState(null);
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 300000); // refresh every 5 mins
        return () => clearInterval(interval);
    }, [fingerprint]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [deviceRes, vitalsRes] = await Promise.all([
                fetchJSON(`/api/dashboard/device/${encodeURIComponent(fingerprint)}`),
                fetchJSON(`/api/dashboard/device/${encodeURIComponent(fingerprint)}/vitals`)
            ]);
            
            if (deviceRes && deviceRes.device) setDevice(deviceRes.device);
            if (vitalsRes && vitalsRes.vitals) {
                setVitalsData(vitalsRes.vitals);
                if (vitalsRes.vitals.length > 0) {
                    setLatestVitals(vitalsRes.vitals[vitalsRes.vitals.length - 1]);
                }
            }
        } catch (error) {
            console.error("Failed to load vitals", error);
        }
        setLoading(false);
    };

    if (loading && !latestVitals) {
        return <div className="p-10 text-center text-slate-500">Loading live vitals...</div>;
    }

    if (!latestVitals) {
        return (
            <div className="w-full flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/devices')} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Live Vitals</h2>
                </div>
                <div className="bg-white dark:bg-[#0f172a] p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500">
                    No vitals data available yet. Please ensure the device is running the latest agent and wait for the next reporting cycle (up to 30 mins).
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/devices')} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Live Vitals: {device?.hostname || fingerprint}</h2>
                        <div className="text-sm text-slate-500">Last updated: {new Date(latestVitals.timestamp).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* CPU Load Gauge */}
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-4 w-full">
                        <Cpu className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">CPU Load</h3>
                    </div>
                    <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
                        <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="8" 
                                className={latestVitals.cpu_load_pct > 85 ? 'text-red-500' : latestVitals.cpu_load_pct > 60 ? 'text-amber-500' : 'text-blue-500'}
                                strokeDasharray="351.858" strokeDashoffset={351.858 - (351.858 * (latestVitals.cpu_load_pct || 0) / 100)} />
                        </svg>
                        <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{Math.round(latestVitals.cpu_load_pct || 0)}%</div>
                    </div>
                </div>

                {/* RAM Gauge */}
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-4 w-full">
                        <Activity className="w-5 h-5 text-purple-500" />
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">Memory Pressure</h3>
                    </div>
                    <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800">
                        <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="8" 
                                className={latestVitals.memory_used_pct > 85 ? 'text-red-500' : latestVitals.memory_used_pct > 60 ? 'text-amber-500' : 'text-purple-500'}
                                strokeDasharray="351.858" strokeDashoffset={351.858 - (351.858 * (latestVitals.memory_used_pct || 0) / 100)} />
                        </svg>
                        <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{Math.round(latestVitals.memory_used_pct || 0)}%</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">{latestVitals.memory_available_gb} GB Available</div>
                </div>

                {/* CPU Temp */}
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 w-full">
                        <Thermometer className="w-5 h-5 text-red-500" />
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">Temperature</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-4xl font-black text-slate-800 dark:text-slate-100">
                        {latestVitals.cpu_temp_c ? `${Math.round(latestVitals.cpu_temp_c)}°C` : 'N/A'}
                    </div>
                </div>

                {/* OS Issues */}
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 w-full">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">OS Issues</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {(!latestVitals.os_issues || latestVitals.os_issues.length === 0) ? (
                            <div className="flex items-center justify-center h-full text-slate-400">No issues detected</div>
                        ) : (
                            <ul className="space-y-2">
                                {latestVitals.os_issues.map((iss, i) => (
                                    <li key={i} className="text-sm bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 p-2 rounded">{iss}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Processes */}
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                        <Box className="w-5 h-5 text-slate-500" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Top Processes</h3>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-3">Process Name</th>
                                    <th className="px-6 py-3">CPU %</th>
                                    <th className="px-6 py-3">Memory (MB)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {(latestVitals.top_processes || []).map((proc, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{proc.name}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, proc.cpu_pct)}%` }}></div>
                                                </div>
                                                <span className="text-slate-500">{proc.cpu_pct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500">{proc.mem_mb} MB</td>
                                    </tr>
                                ))}
                                {(!latestVitals.top_processes || latestVitals.top_processes.length === 0) && (
                                    <tr><td colSpan="3" className="p-6 text-center text-slate-400">No process data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Disk Health */}
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-slate-500" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Storage Drives</h3>
                    </div>
                    <div className="p-6 flex-1 space-y-4">
                        {(latestVitals.disk_health || []).map((disk, i) => (
                            <div key={i} className="flex flex-col gap-2 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{disk.model}</span>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${disk.smart_status === 'OK' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                        SMART: {disk.smart_status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-slate-500">
                                    <span>Usage: {disk.used_pct ? `${disk.used_pct}%` : 'Unknown'}</span>
                                    {disk.temp_c && <span>Temp: {disk.temp_c}°C</span>}
                                </div>
                                {disk.used_pct && (
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                        <div className={`h-full ${disk.used_pct > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${disk.used_pct}%` }}></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceVitals;
