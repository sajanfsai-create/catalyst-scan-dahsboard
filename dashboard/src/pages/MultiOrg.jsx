import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';
import { Building, Building2, UserCog, Link as LinkIcon, Download } from 'lucide-react';

const MultiOrg = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [partners, setPartners] = useState([]);
    
    // Assign form
    const [assignPartnerId, setAssignPartnerId] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const result = await fetchJSON('/api/dashboard/multi-org/summary');
        if (result) {
            setData(result);
            setPartners(result.partners || []);
        }
        setLoading(false);
    };

    const handleAssignPartner = async (e) => {
        e.preventDefault();
        if (!selectedOrg) return;
        setIsAssigning(true);
        const result = await postJSON(`/api/admin/organizations/${selectedOrg.org_id}/assign`, {
            partner_id: assignPartnerId
        });
        if (result && result.success) {
            alert('Partner assigned successfully.');
            loadData();
            setSelectedOrg(null);
        } else {
            alert(result?.error || 'Failed to assign partner.');
        }
        setIsAssigning(false);
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Loading Multi-Org data...</div>;
    }

    if (!data) {
        return <div className="p-10 text-center text-slate-500">Failed to load data.</div>;
    }

    return (
        <div className="w-full flex flex-col gap-6">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{data.stats?.total_orgs || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Total Organizations</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-indigo-500">{data.stats?.total_partners || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Registered Partners</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                        <UserCog className="w-6 h-6 text-indigo-500" />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-emerald-500">{data.stats?.total_devices || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Devices Managed</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Building className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Organizations List */}
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-500" /> Organization Hierarchy
                    </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                    {data.organizations?.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">No organizations found.</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Organization Name</th>
                                    <th className="px-6 py-4">Org ID</th>
                                    <th className="px-6 py-4">Assigned Partner</th>
                                    <th className="px-6 py-4 text-center">Devices</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {data.organizations.map(org => (
                                    <tr key={org.org_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{org.org_name}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{org.org_id}</td>
                                        <td className="px-6 py-4">
                                            {org.partner_id ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-lg text-xs font-semibold">
                                                    <UserCog className="w-3 h-3" /> {org.partner_name || org.partner_id}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-semibold">
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                            {org.device_count || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => setSelectedOrg(org)}
                                                className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold text-sm transition-colors flex items-center gap-1"
                                            >
                                                <LinkIcon className="w-4 h-4" /> Reassign
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Assign Modal */}
            {selectedOrg && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrg(null)}>
                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Assign Partner</h2>
                            <button onClick={() => setSelectedOrg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Assigning partner to organization: <strong className="text-slate-800 dark:text-slate-200">{selectedOrg.org_name}</strong>
                            </p>
                            
                            <form onSubmit={handleAssignPartner} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Partner</label>
                                    <select 
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        required 
                                        value={assignPartnerId} 
                                        onChange={e => setAssignPartnerId(e.target.value)}
                                    >
                                        <option value="">-- Unassigned --</option>
                                        {partners.map(p => (
                                            <option key={p.id} value={p.id}>{p.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedOrg(null)}
                                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isAssigning}
                                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-md transition-all disabled:opacity-70"
                                    >
                                        {isAssigning ? 'Saving...' : 'Save Assignment'}
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

export default MultiOrg;
