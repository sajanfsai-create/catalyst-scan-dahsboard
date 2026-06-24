import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';
import { Settings2, BellRing, Mail, Link as LinkIcon, MessageSquare } from 'lucide-react';

const AlertConfig = () => {
    const [orgs, setOrgs] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [config, setConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saveResult, setSaveResult] = useState('');

    useEffect(() => {
        loadOrgs();
    }, []);

    useEffect(() => {
        if (selectedOrgId) {
            loadConfig(selectedOrgId);
        } else {
            setConfig(null);
        }
    }, [selectedOrgId]);

    const loadOrgs = async () => {
        const data = await fetchJSON('/api/dashboard/multi-org/summary');
        if (data && data.organizations) {
            setOrgs(data.organizations);
        }
    };

    const loadConfig = async (orgId) => {
        setLoadingConfig(true);
        setSaveResult('');
        const data = await fetchJSON(`/api/dashboard/alert-config/${orgId}`);
        if (data) {
            setConfig({
                email_enabled: !!data.email_enabled,
                email_recipients: data.email_recipients || '',
                webhook_enabled: !!data.webhook_enabled,
                webhook_url: data.webhook_url || '',
                whatsapp_enabled: !!data.whatsapp_enabled,
                whatsapp_numbers: data.whatsapp_numbers || '',
                alert_on_tamper: !!data.alert_on_tamper,
                alert_on_offline: !!data.alert_on_offline,
                alert_on_grade_drop: !!data.alert_on_grade_drop,
                alert_on_amc_expiry: !!data.alert_on_amc_expiry,
            });
        }
        setLoadingConfig(false);
    };

    const handleConfigChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        setSaveResult('Saving...');
        const payload = {
            org_id: selectedOrgId,
            email_enabled: config.email_enabled ? 1 : 0,
            email_recipients: config.email_recipients,
            webhook_enabled: config.webhook_enabled ? 1 : 0,
            webhook_url: config.webhook_url,
            whatsapp_enabled: config.whatsapp_enabled ? 1 : 0,
            whatsapp_numbers: config.whatsapp_numbers,
            alert_on_tamper: config.alert_on_tamper ? 1 : 0,
            alert_on_offline: config.alert_on_offline ? 1 : 0,
            alert_on_grade_drop: config.alert_on_grade_drop ? 1 : 0,
            alert_on_amc_expiry: config.alert_on_amc_expiry ? 1 : 0,
        };
        const result = await postJSON('/api/dashboard/alert-config', payload);
        if (result && result.success) {
            setSaveResult('✅ Configuration saved successfully!');
            setTimeout(() => setSaveResult(''), 3000);
        } else {
            setSaveResult('❌ Failed to save configuration');
        }
    };

    const handleTestAlert = async (channel) => {
        setSaveResult(`Sending test alert via ${channel}...`);
        const result = await postJSON('/api/dashboard/send-test-alert', { org_id: selectedOrgId, channel });
        if (result && result.success) {
            setSaveResult(`✅ ${result.message || 'Test sent!'}`);
        } else {
            setSaveResult(`⚠️ ${result?.message || 'Test failed'}`);
        }
    };

    return (
        <div className="w-full flex flex-col gap-6 max-w-5xl mx-auto">
            
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <Settings2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Alert Configurations</h2>
                        <p className="text-sm text-slate-500">Manage notification channels per organization.</p>
                    </div>
                </div>
                <div className="w-full sm:w-auto">
                    <select 
                        className="w-full sm:w-64 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                    >
                        <option value="">-- Select Organization --</option>
                        {orgs.map(o => (
                            <option key={o.org_id} value={o.org_id}>{o.org_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loadingConfig && <div className="p-10 text-center text-slate-500">Loading configuration...</div>}

            {config && !loadingConfig && (
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 space-y-8">
                        
                        {/* Channels */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BellRing className="w-4 h-4 text-slate-400" /> Notification Channels
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Email */}
                                <div className={`p-5 rounded-xl border transition-colors ${config.email_enabled ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <input 
                                            type="checkbox" 
                                            name="email_enabled" 
                                            checked={config.email_enabled} 
                                            onChange={handleConfigChange}
                                            className="w-4 h-4 text-blue-500 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                                        />
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-blue-500" /> Email
                                        </h4>
                                    </div>
                                    <input 
                                        name="email_recipients" 
                                        value={config.email_recipients} 
                                        onChange={handleConfigChange}
                                        placeholder="admin@college.edu" 
                                        disabled={!config.email_enabled}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none disabled:opacity-50"
                                    />
                                </div>

                                {/* Webhook */}
                                <div className={`p-5 rounded-xl border transition-colors ${config.webhook_enabled ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <input 
                                            type="checkbox" 
                                            name="webhook_enabled" 
                                            checked={config.webhook_enabled} 
                                            onChange={handleConfigChange}
                                            className="w-4 h-4 text-emerald-500 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500"
                                        />
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4 text-emerald-500" /> Webhook
                                        </h4>
                                    </div>
                                    <input 
                                        name="webhook_url" 
                                        value={config.webhook_url} 
                                        onChange={handleConfigChange}
                                        placeholder="https://hooks.slack.com/..." 
                                        disabled={!config.webhook_enabled}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none disabled:opacity-50"
                                    />
                                </div>

                                {/* WhatsApp */}
                                <div className={`p-5 rounded-xl border transition-colors ${config.whatsapp_enabled ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <input 
                                            type="checkbox" 
                                            name="whatsapp_enabled" 
                                            checked={config.whatsapp_enabled} 
                                            onChange={handleConfigChange}
                                            className="w-4 h-4 text-emerald-500 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500"
                                        />
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp
                                        </h4>
                                    </div>
                                    <input 
                                        name="whatsapp_numbers" 
                                        value={config.whatsapp_numbers} 
                                        onChange={handleConfigChange}
                                        placeholder="+91 98765 43210" 
                                        disabled={!config.whatsapp_enabled}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Triggers */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">Alert Triggers</h4>
                            <div className="flex flex-wrap gap-4 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <input type="checkbox" name="alert_on_tamper" checked={config.alert_on_tamper} onChange={handleConfigChange} className="w-4 h-4 text-blue-500 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500" />
                                    🛡️ Tamper/Theft
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <input type="checkbox" name="alert_on_offline" checked={config.alert_on_offline} onChange={handleConfigChange} className="w-4 h-4 text-blue-500 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500" />
                                    🔴 Device Offline
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <input type="checkbox" name="alert_on_grade_drop" checked={config.alert_on_grade_drop} onChange={handleConfigChange} className="w-4 h-4 text-blue-500 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500" />
                                    📉 Grade Drop
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <input type="checkbox" name="alert_on_amc_expiry" checked={config.alert_on_amc_expiry} onChange={handleConfigChange} className="w-4 h-4 text-blue-500 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500" />
                                    ⏳ AMC Expiry
                                </label>
                            </div>
                        </div>

                    </div>
                    
                    {/* Action Bar */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                        <button 
                            onClick={handleSave}
                            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
                        >
                            Save Configuration
                        </button>
                        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                        <button 
                            onClick={() => handleTestAlert('webhook')}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors"
                        >
                            Test Webhook
                        </button>
                        <button 
                            onClick={() => handleTestAlert('email')}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors"
                        >
                            Test Email
                        </button>
                        
                        {saveResult && (
                            <span className={`ml-auto text-sm font-semibold ${saveResult.includes('❌') || saveResult.includes('⚠️') ? 'text-red-500' : 'text-emerald-500'}`}>
                                {saveResult}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {!config && !loadingConfig && (
                <div className="py-20 text-center text-slate-500">
                    Select an organization above to view and edit its alert configurations.
                </div>
            )}

        </div>
    );
};

export default AlertConfig;
