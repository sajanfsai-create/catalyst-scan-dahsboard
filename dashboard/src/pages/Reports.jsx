import React, { useState } from 'react';
import { fetchJSON } from '../api';
import { DownloadCloud, FileText, CheckCircle2 } from 'lucide-react';

const Reports = () => {
    const [auditData, setAuditData] = useState(null);
    const [loadingAudit, setLoadingAudit] = useState(false);

    const downloadAssetCSV = async () => {
        const result = await fetchJSON('/api/dashboard/export/devices');
        if (result && result.csv) {
            triggerDownload(result.csv, 'devices_export.csv');
        } else {
            alert('Failed to generate export.');
        }
    };

    const runAudit = async () => {
        setLoadingAudit(true);
        const result = await fetchJSON('/api/dashboard/audit');
        if (result && result.audit) {
            setAuditData(result.audit);
        } else {
            alert('Audit failed.');
        }
        setLoadingAudit(false);
    };

    const triggerDownload = (content, filename) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full flex flex-col gap-6 max-w-5xl mx-auto">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Export Reports Card */}
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                        <DownloadCloud className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Export Reports</h3>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Download comprehensive datasets in CSV format for offline analysis, accounting, or record keeping.
                        </p>
                        
                        <div className="space-y-4 mt-auto">
                            <button 
                                onClick={downloadAssetCSV}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm"
                            >
                                <FileText className="w-4 h-4 text-blue-500" /> Download Full Asset CSV
                            </button>
                            <button 
                                onClick={() => alert("E-Waste report export coming soon")}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm"
                            >
                                <FileText className="w-4 h-4 text-emerald-500" /> Download E-Waste Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* System Audit Card */}
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">System Audit</h3>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Run a high-level consistency check across all organizations, devices, and licenses to ensure data integrity.
                        </p>
                        
                        {!auditData ? (
                            <div className="mt-auto flex justify-center">
                                <button 
                                    onClick={runAudit}
                                    disabled={loadingAudit}
                                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loadingAudit ? 'Running Audit...' : 'Run Consistency Audit'}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-auto bg-slate-50 dark:bg-slate-900/80 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Audit Results</h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                                        <span className="text-slate-500">Total Devices Checked</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{auditData.total_devices}</span>
                                    </li>
                                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                                        <span className="text-slate-500">Total Organizations</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{auditData.total_orgs}</span>
                                    </li>
                                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                                        <span className="text-slate-500">Total Scans Allocated</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{auditData.total_scans_allocated}</span>
                                    </li>
                                    <li className="flex justify-between pb-1">
                                        <span className="text-slate-500">Total Scans Used</span>
                                        <span className="font-bold text-amber-600 dark:text-amber-500">{auditData.total_scans_used}</span>
                                    </li>
                                </ul>
                                <button 
                                    onClick={() => setAuditData(null)}
                                    className="mt-4 w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Clear Results
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Reports;
