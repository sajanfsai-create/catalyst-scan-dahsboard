import React, { useState, useEffect } from 'react';
import { fetchJSON } from '../api';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/dashboard/alerts');
        if (data && data.alerts) {
            setAlerts(data.alerts);
        }
        setLoading(false);
    };

    const handleAcknowledge = async (id) => {
        // Assume endpoint for acknowledging
        // const res = await postJSON(`/api/dashboard/alerts/${id}/acknowledge`);
        setAlerts(alerts.filter(a => a.id !== id));
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

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" /> Tamper Alerts
                    </h3>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="text-center text-slate-500 py-10">Loading alerts...</div>
                    ) : alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No active alerts!</h3>
                            <p className="text-sm">All devices are operating normally.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {alerts.map(alert => (
                                <div key={alert.id} className="bg-slate-50 dark:bg-slate-900/50 border border-red-200 dark:border-red-500/20 border-l-4 border-l-red-500 rounded-xl p-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                                            {alert.event_type.replace(/_/g, ' ').toUpperCase()} on {alert.hostname}
                                        </h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                            {alert.message}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                                            <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">Org: {alert.org_name}</span>
                                            <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">Triggered: {timeAgo(alert.timestamp)}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAcknowledge(alert.id)}
                                        className="shrink-0 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Alerts;
