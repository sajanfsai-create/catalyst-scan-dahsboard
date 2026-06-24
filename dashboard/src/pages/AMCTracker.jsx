import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';
import { CalendarDays, AlertTriangle, ShieldCheck, Clock, FileText } from 'lucide-react';

const AMCTracker = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form state
    const [amcOrg, setAmcOrg] = useState('');
    const [amcVendor, setAmcVendor] = useState('');
    const [amcStart, setAmcStart] = useState('');
    const [amcEnd, setAmcEnd] = useState('');
    const [amcNotes, setAmcNotes] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const result = await fetchJSON('/api/dashboard/amc');
        if (result) {
            setData(result);
        }
        setLoading(false);
    };

    const handleAddRecord = async (e) => {
        e.preventDefault();
        const payload = {
            org_id: amcOrg,
            vendor: amcVendor,
            start_date: amcStart,
            end_date: amcEnd,
            notes: amcNotes
        };
        const result = await postJSON('/api/dashboard/amc', payload);
        if (result && result.success) {
            alert('AMC Record added successfully.');
            setShowForm(false);
            setAmcOrg(''); setAmcVendor(''); setAmcStart(''); setAmcEnd(''); setAmcNotes('');
            loadData();
        } else {
            alert('Failed to add AMC record.');
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Loading AMC data...</div>;
    }

    if (!data) {
        return <div className="p-10 text-center text-slate-500">Failed to load AMC records.</div>;
    }

    const { summary = {}, records = [], organizations = [] } = data;

    return (
        <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{summary.total_active || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Active Contracts</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-amber-500">{summary.expiring_soon || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Expiring &lt; 30 Days</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-red-500">{summary.expired || 0}</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Expired Contracts</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-colors" onClick={() => setShowForm(!showForm)}>
                    <div>
                        <div className="text-lg font-extrabold text-blue-500">Add Record</div>
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Create new contract</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <span className="text-blue-500 text-2xl font-bold">+</span>
                    </div>
                </div>
            </div>

            {/* Add Record Form */}
            {showForm && (
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-blue-200 dark:border-blue-500/30 shadow-lg overflow-hidden transition-all">
                    <div className="px-6 py-4 border-b border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 flex justify-between items-center">
                        <h3 className="font-bold text-blue-800 dark:text-blue-400">Add New AMC Record</h3>
                        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleAddRecord} className="space-y-4 max-w-2xl">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Organization</label>
                                <select 
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    required 
                                    value={amcOrg} 
                                    onChange={e => setAmcOrg(e.target.value)}
                                >
                                    <option value="">-- Select Org --</option>
                                    {organizations.map(o => <option key={o.org_id} value={o.org_id}>{o.org_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Vendor Name</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    required 
                                    value={amcVendor} 
                                    onChange={e => setAmcVendor(e.target.value)} 
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Start Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        required 
                                        value={amcStart} 
                                        onChange={e => setAmcStart(e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">End Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        required 
                                        value={amcEnd} 
                                        onChange={e => setAmcEnd(e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notes (Optional)</label>
                                <textarea 
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    rows="2" 
                                    value={amcNotes} 
                                    onChange={e => setAmcNotes(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-md transition-colors">
                                    Save AMC Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Records Table */}
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-slate-500" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Annual Maintenance Contracts</h3>
                </div>
                <div className="p-0 overflow-x-auto">
                    {records.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">No AMC records found.</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4">Start Date</th>
                                    <th className="px-6 py-4">End Date</th>
                                    <th className="px-6 py-4">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {records.map(r => {
                                    const isExpired = r.status === 'expired';
                                    const isExpiring = r.status === 'expiring_soon';
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                    isExpired ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                                                    isExpiring ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                                }`}>
                                                    {isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{r.org_name}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.vendor}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.start_date}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{r.end_date}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{r.notes || '-'}</td>
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

export default AMCTracker;
