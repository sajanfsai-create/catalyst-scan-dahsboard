import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';
import { Users, Plus, Key } from 'lucide-react';

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // list or form
    
    // Form state
    const [partnerUsername, setPartnerUsername] = useState('');
    const [partnerPassword, setPartnerPassword] = useState('');

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/admin/users');
        if (data && data.users) {
            setPartners(data.users.filter(u => u.role === 'partner'));
        }
        setLoading(false);
    };

    const handleCreatePartner = async (e) => {
        e.preventDefault();
        const payload = {
            username: partnerUsername,
            password: partnerPassword,
            role: 'partner'
        };
        const result = await postJSON('/api/admin/users', payload);
        if (result && result.success) {
            alert('Partner created successfully.');
            setPartnerUsername('');
            setPartnerPassword('');
            setViewMode('list');
            loadPartners();
        } else {
            alert(result?.error || 'Failed to create partner.');
        }
    };

    const handleResetPassword = async (id, username) => {
        const newPass = prompt(`Set new password for partner "${username}":\n(Minimum 6 characters)`);
        if (!newPass) return;
        if (newPass.length < 6) { alert('Password must be at least 6 characters.'); return; }
        
        const result = await postJSON(`/api/admin/users/${id}/reset-password`, { new_password: newPass });
        if (result && result.success) {
            alert(`Password for "${username}" reset successfully.`);
        } else {
            alert('Failed to reset password.');
        }
    };

    return (
        <div className="w-full flex flex-col gap-6 max-w-5xl mx-auto">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-500" /> Partner Management
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage B2B partners and system integrators.</p>
                </div>
                {viewMode === 'list' ? (
                    <button 
                        onClick={() => setViewMode('form')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" /> Add Partner
                    </button>
                ) : (
                    <button 
                        onClick={() => setViewMode('list')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
                    >
                        Back to List
                    </button>
                )}
            </div>

            {viewMode === 'form' ? (
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 max-w-lg">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">Create New Partner</h3>
                    <form onSubmit={handleCreatePartner} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username (Partner ID)</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                value={partnerUsername}
                                onChange={e => setPartnerUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Initial Password</label>
                            <input 
                                type="password" 
                                required 
                                minLength="6"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                value={partnerPassword}
                                onChange={e => setPartnerPassword(e.target.value)}
                            />
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setViewMode('list')} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-md transition-all">
                                Create Partner
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-0 overflow-x-auto">
                        {loading ? (
                            <div className="p-10 text-center text-slate-500">Loading partners...</div>
                        ) : partners.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">No partners found.</div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Created At</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {partners.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{p.id}</td>
                                            <td className="px-6 py-4">
                                                <strong className="text-slate-800 dark:text-slate-200">{p.username}</strong>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-xs font-bold capitalize">
                                                    {p.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => handleResetPassword(p.id, p.username)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded transition-colors"
                                                >
                                                    <Key className="w-3.5 h-3.5" /> Reset Pass
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Partners;
