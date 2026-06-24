import React, { useState, useEffect } from 'react';
import { fetchJSON } from '../api';
import { PcCase, HardDrive, Monitor, Activity } from 'lucide-react';

const LabUtilization = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const result = await fetchJSON('/api/dashboard/lab-utilization');
        if (result) {
            setData(result);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Loading lab utilization data...</div>;
    }

    if (!data || !data.organizations) {
        return <div className="p-10 text-center text-slate-500">Failed to load lab data.</div>;
    }

    return (
        <div className="w-full flex flex-col gap-6">
            
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                    <PcCase className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Lab & Organization Utilization</h3>
                </div>
                <div className="p-0 overflow-x-auto">
                    {data.organizations.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">No organizational data found.</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Total Devices</th>
                                    <th className="px-6 py-4">Active / Online</th>
                                    <th className="px-6 py-4 text-center">Avg Score</th>
                                    <th className="px-6 py-4">Grade Breakdown</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {data.organizations.map(org => {
                                    const grades = org.grades || {};
                                    return (
                                        <tr key={org.org_name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <strong className="text-slate-800 dark:text-slate-200">{org.org_name}</strong>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                {org.device_count}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-xs font-bold">
                                                    {org.active_count} Online
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold border-4 ${
                                                    org.avg_score >= 80 ? 'text-emerald-500 border-emerald-500/20' :
                                                    org.avg_score >= 60 ? 'text-amber-500 border-amber-500/20' :
                                                    'text-red-500 border-red-500/20'
                                                }`}>
                                                    {Math.round(org.avg_score)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5">
                                                    <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold" title="Grade A/B">
                                                        {(grades.A || 0) + (grades.B || 0)}
                                                    </span>
                                                    <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 flex items-center justify-center text-xs font-bold" title="Grade C">
                                                        {grades.C || 0}
                                                    </span>
                                                    <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold" title="Grade D/F">
                                                        {(grades.D || 0) + (grades.F || 0)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    className="text-indigo-500 hover:text-indigo-600 font-semibold text-sm transition-colors"
                                                    onClick={() => alert(`Detailed view for ${org.org_name} coming soon.`)}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </div>
    );
};

export default LabUtilization;
