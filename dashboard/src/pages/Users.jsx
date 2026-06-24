import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';
import { UserCog, Plus, Key } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // list or form
    
    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('org_user');
    const [orgId, setOrgId] = useState('');

    useEffect(() => {
        loadUsers();
        loadOrgs();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/admin/users');
        if (data && data.users) {
            setUsers(data.users);
        }
        setLoading(false);
    };

    const loadOrgs = async () => {
        const data = await fetchJSON('/api/dashboard/multi-org/summary');
        if (data && data.organizations) {
            setOrgs(data.organizations);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const payload = { username, password, role };
        if (role === 'org_user' && orgId) {
            payload.org_id = orgId;
        }
        const result = await postJSON('/api/admin/users', payload);
        if (result && result.success) {
            alert('User created successfully.');
            setUsername(''); setPassword(''); setRole('org_user'); setOrgId('');
            setViewMode('list');
            loadUsers();
        } else {
            alert(result?.error || 'Failed to create user.');
        }
    };

    const handleResetPassword = async (id, uname) => {
        const newPass = prompt(`Set new password for user "${uname}":\n(Minimum 6 characters)`);
        if (!newPass) return;
        if (newPass.length < 6) { alert('Password must be at least 6 characters.'); return; }
        
        const result = await postJSON(`/api/admin/users/${id}/reset-password`, { new_password: newPass });
        if (result && result.success) {
            alert(`Password for "${uname}" reset successfully.`);
        } else {
            alert('Failed to reset password.');
        }
    };

    return (
        <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <UserCog className="w-6 h-6 text-blue-500" /> User Management
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage global users, org users, and admins.</p>
                </div>
                {viewMode === 'list' ? (
                    <button 
                        onClick={() => setViewMode('form')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" /> Add User
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
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">Create New User</h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Initial Password</label>
                            <input 
                                type="password" 
                                required 
                                minLength="6"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                            <select 
                                required 
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                            >
                                <option value="org_user">Org User</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>
                        {role === 'org_user' && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Organization</label>
                                <select 
                                    required={role === 'org_user'}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={orgId}
                                    onChange={e => setOrgId(e.target.value)}
                                >
                                    <option value="">-- Select Org --</option>
                                    {orgs.map(o => (
                                        <option key={o.org_id} value={o.org_id}>{o.org_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setViewMode('list')} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-md transition-all">
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-0 overflow-x-auto">
                        {loading ? (
                            <div className="p-10 text-center text-slate-500">Loading users...</div>
                        ) : users.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">No users found.</div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Organization</th>
                                        <th className="px-6 py-4">Created At</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {users.map(u => {
                                        const isSuper = u.role === 'super_admin';
                                        const isPartner = u.role === 'partner';
                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{u.id}</td>
                                                <td className="px-6 py-4">
                                                    <strong className="text-slate-800 dark:text-slate-200">{u.username}</strong>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                        isSuper ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : 
                                                        isPartner ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 
                                                        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                    } capitalize`}>
                                                        {u.role.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {u.org_id ? u.org_id : <span className="text-slate-400 italic">Global</span>}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => handleResetPassword(u.id, u.username)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded transition-colors"
                                                    >
                                                        <Key className="w-3.5 h-3.5" /> Reset Pass
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
            )}
        </div>
    );
};

export default Users;
