import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';
import { Key, Upload, FileDown } from 'lucide-react';

const Licenses = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bulkCsv, setBulkCsv] = useState('');
    const [defaultCredits, setDefaultCredits] = useState(2);
    const [bulkResult, setBulkResult] = useState(null);

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

    const handleQuickAdd = async (fingerprint, count) => {
        const payload = { fingerprint, count };
        const result = await postJSON('/api/dashboard/device/add-scans', payload);
        if (result && result.success) {
            loadDevices(); // Reload to show new count
            alert(`Successfully added ${count} scans to device.`);
        } else {
            alert('Failed to add scans.');
        }
    };

    const downloadCsvTemplate = () => {
        const csvContent = "fingerprint,count\nexample_fp_12345,5\nanother_fp_67890,2\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "bulk_license_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setBulkCsv(event.target.result);
            reader.readAsText(file);
        }
    };

    const submitBulkLicense = async () => {
        if (!bulkCsv.trim()) {
            alert('Please paste or upload CSV content first.');
            return;
        }
        setBulkResult('loading');
        const data = await postJSON('/api/dashboard/bulk-license', { csv: bulkCsv, count: defaultCredits });
        setBulkResult(data || { failed: true });
        if (data && !data.failed) {
            loadDevices();
        }
    };

    return (
        <div className="w-full flex flex-col gap-6">
            
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Key className="w-5 h-5 text-amber-500" /> Bulk License Manager
                    </h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-wrap gap-3 mb-4">
                        <button 
                            onClick={downloadCsvTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                        >
                            <FileDown className="w-4 h-4" /> Download CSV Template
                        </button>
                        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer">
                            <Upload className="w-4 h-4" /> Upload CSV File
                            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                        </label>
                    </div>
                    
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        Paste CSV content with fingerprints to add scan credits in bulk. Format: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">fingerprint,count</code> (one per line). If count is omitted, default credits apply.
                    </p>
                    
                    <textarea 
                        value={bulkCsv}
                        onChange={(e) => setBulkCsv(e.target.value)}
                        rows="6" 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
                        placeholder="abc123def456,5&#10;xyz789ghi012,3"
                    ></textarea>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default credits:</label>
                            <input 
                                type="number" 
                                value={defaultCredits}
                                onChange={(e) => setDefaultCredits(parseInt(e.target.value) || 0)}
                                min="1" 
                                className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                            />
                        </div>
                        <button 
                            onClick={submitBulkLicense}
                            disabled={bulkResult === 'loading'}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-md shadow-blue-500/20 transition-all disabled:opacity-70"
                        >
                            {bulkResult === 'loading' ? 'Processing...' : 'Process CSV'}
                        </button>
                    </div>

                    {bulkResult && bulkResult !== 'loading' && (
                        <div className="mt-6">
                            {bulkResult.failed === true ? (
                                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 font-medium">
                                    ❌ Failed to process CSV
                                </div>
                            ) : (
                                <div>
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-sm mb-4">
                                        Processed: <span className="font-bold">{bulkResult.processed}</span> | 
                                        Success: <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">{bulkResult.success}</span> | 
                                        Failed: <span className="font-bold text-red-600 dark:text-red-400 ml-1">{bulkResult.failed}</span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                                        {(bulkResult.details || []).map((d, i) => (
                                            <div key={i} className="py-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                                                {d.fingerprint.substring(0, 16)}... → 
                                                {d.status === 'ok' ? 
                                                    <span className="text-emerald-500 font-bold ml-2">+{d.added}</span> : 
                                                    <span className="text-red-500 font-bold ml-2">❌ {d.status}</span>
                                                }
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Device License Status</h3>
                </div>
                <div className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading licenses...</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Hostname / Fingerprint</th>
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Total Scans</th>
                                    <th className="px-6 py-4">Used</th>
                                    <th className="px-6 py-4">Remaining</th>
                                    <th className="px-6 py-4">Quick Add</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {devices.map(device => {
                                    const remaining = (device.total_scans || 0) - (device.scans_used || 0);
                                    return (
                                        <tr key={device.fingerprint} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <strong className="text-slate-800 dark:text-slate-200 block">{device.hostname || 'Unknown'}</strong>
                                                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">{device.fingerprint.substring(0,24)}...</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{device.org_name || '-'}</td>
                                            <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{device.total_scans}</td>
                                            <td className="px-6 py-4 text-amber-600 dark:text-amber-500 font-medium">{device.scans_used}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                    remaining > 5 ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                                                    remaining > 0 ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20' : 
                                                    'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                                }`}>
                                                    {remaining} left
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                                    onClick={() => handleQuickAdd(device.fingerprint, 10)}
                                                >
                                                    +10 Scans
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

export default Licenses;
