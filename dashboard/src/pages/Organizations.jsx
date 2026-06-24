import React, { useState, useEffect } from 'react';
import { fetchJSON } from '../api';
import { Building, Plus, Settings2 } from 'lucide-react';

const Organizations = () => {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Simplistic forms for demonstration
    const [editModal, setEditModal] = useState(null);

    useEffect(() => {
        loadOrgs();
    }, []);

    const loadOrgs = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/dashboard/multi-org/summary');
        if (data && data.organizations) {
            setOrgs(data.organizations);
        }
        setLoading(false);
    };

    return (
        <div className="w-full flex flex-col gap-6 max-w-5xl mx-auto">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Building className="w-6 h-6 text-blue-500" /> Organizations Management
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage tenant organizations and settings.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]">
                    <Plus className="w-4 h-4" /> Add Organization
                </button>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading organizations...</div>
                    ) : orgs.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">No organizations found.</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Org ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Devices</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {orgs.map(org => (
                                    <tr key={org.org_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {org.org_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <strong className="text-slate-800 dark:text-slate-200">{org.org_name}</strong>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-full">
                                                {org.device_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => setEditModal(org)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded transition-colors"
                                            >
                                                <Settings2 className="w-3.5 h-3.5" /> Configure
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {editModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit Organization</h2>
                            <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="p-6">
                            <form className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Org ID</label>
                                    <input type="text" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" value={editModal.org_id} readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Organization Name</label>
                                    <input type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50" defaultValue={editModal.org_name} />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setEditModal(null)} className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors">
                                        Cancel
                                    </button>
                                    <button type="button" onClick={() => alert('Save functionality not implemented yet')} className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-md transition-all">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Organizations;
