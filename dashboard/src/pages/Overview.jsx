import React, { useState, useEffect } from 'react';
import { fetchJSON } from '../api';
import { ShieldAlert, MonitorCheck, TrendingDown, Users } from 'lucide-react';

const Overview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentAlerts, setRecentAlerts] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/dashboard/stats');
        if (data) {
            setStats(data);
            setRecentAlerts(data.recent_alerts || []);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Loading overview data...</div>;
    }

    if (!stats) {
        return <div className="p-10 text-center text-slate-500">Failed to load stats.</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full">

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{stats.total_devices || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Total Devices</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <MonitorCheck className="w-6 h-6 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-emerald-500">{stats.online_devices || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Online Now</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <MonitorCheck className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-amber-500">{stats.grade_c_below || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Needs Attention</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                        <TrendingDown className="w-6 h-6 text-amber-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-red-500">{stats.active_alerts || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Active Alerts</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Health Overview Chart placeholder */}
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Fleet Health Grade Distribution</h3>
                    </div>
                    <div className="p-6 flex-1 flex flex-col items-center justify-center">
                        <div className="flex flex-wrap gap-4 justify-center mt-4">
                            {(stats.grades || []).map(g => {
                                const isGood = g.grade === 'A' || g.grade === 'B';
                                const isBad = g.grade === 'D' || g.grade === 'F';
                                return (
                                    <div key={g.grade} className="flex flex-col items-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 min-w-[80px]">
                                        <div className={`text-2xl font-black mb-1 ${isGood ? 'text-emerald-500' : isBad ? 'text-red-500' : 'text-amber-500'}`}>{g.grade}</div>
                                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{g.count} devices</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Recent Alerts List */}
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Alerts</h3>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">Action Needed</span>
                    </div>
                    <div className="p-0">
                        {recentAlerts.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 text-sm">No active alerts at this time.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {recentAlerts.map(alert => (
                                    <div key={alert.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4">
                                        <div className="shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{alert.message}</h4>
                                            <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                                <span>{alert.hostname}</span>
                                                <span>•</span>
                                                <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Overview;
