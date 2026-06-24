import React, { useState, useEffect } from 'react';
import { fetchJSON } from '../api';
import { Recycle, AlertTriangle, Trash2, ShieldCheck } from 'lucide-react';

const getGradeClasses = (grade) => {
    switch ((grade || '').toLowerCase()) {
        case 'a': return 'bg-emerald-500/15 text-emerald-500';
        case 'b': return 'bg-blue-500/15 text-blue-500';
        case 'c': return 'bg-amber-500/15 text-amber-500';
        case 'd':
        case 'f': return 'bg-red-500/15 text-red-500';
        default: return 'bg-slate-500/15 text-slate-500';
    }
};

const EWaste = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/dashboard/ewaste-report');
        if (data) {
            setReport(data);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Loading E-Waste compliance report...</div>;
    }

    if (!report) {
        return <div className="p-10 text-center text-slate-500">Failed to load report.</div>;
    }

    const flagStyles = {
        'keep': { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', label: 'Keep' },
        'review': { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', label: 'Review' },
        'dispose': { icon: Trash2, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20', label: 'E-Waste' }
    };

    return (
        <div className="w-full flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-emerald-500"></div>
                    <div className="text-4xl font-extrabold text-emerald-500 mb-1">{report.keep || 0}</div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Keep (Good Condition)</div>
                </div>
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-amber-500"></div>
                    <div className="text-4xl font-extrabold text-amber-500 mb-1">{report.review || 0}</div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Review Required</div>
                </div>
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-red-500"></div>
                    <div className="text-4xl font-extrabold text-red-500 mb-1">{report.e_waste || 0}</div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">E-Waste Disposal</div>
                </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 border-l-4 border-l-blue-500 rounded-xl text-sm text-blue-800 dark:text-blue-300">
                <strong className="font-bold">Compliance Note:</strong> {report.compliance_note || 'This report helps identify obsolete hardware based on BIOS age and health grades.'}
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                    <Recycle className="w-5 h-5 text-slate-500" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Asset Disposal Status</h3>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Hostname</th>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Age (Years)</th>
                                <th className="px-6 py-4">Grade</th>
                                <th className="px-6 py-4">CPU</th>
                                <th className="px-6 py-4">RAM</th>
                                <th className="px-6 py-4">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {(report.items || []).map((item, idx) => {
                                const flag = item.disposal_flag || 'keep';
                                const style = flagStyles[flag] || flagStyles['keep'];
                                const FlagIcon = style.icon;
                                
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.color} ${style.border}`}>
                                                <FlagIcon className="w-3.5 h-3.5" /> {style.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <strong className="text-slate-800 dark:text-slate-200">{item.hostname || 'Unknown'}</strong>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.org_name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{item.bios_age_years != null ? item.bios_age_years : 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md font-bold text-sm ${getGradeClasses(item.overall_grade)}`}>
                                                {item.overall_grade || '?'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                                            {item.cpu || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                                            {item.ram_gb ? `${item.ram_gb} GB` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-[250px] truncate">
                                            {item.reason || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!report.items || report.items.length === 0) && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                        No devices found in the disposal report.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default EWaste;
