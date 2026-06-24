import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';

const SiteSettings = () => {
    const [settings, setSettings] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [settingsData, logsData] = await Promise.all([
            fetchJSON('/api/admin/site-settings'),
            fetchJSON('/api/admin/audit-log')
        ]);
        
        if (settingsData) {
            const get = (key, fb) => settingsData[key] ? settingsData[key].setting_value : fb;
            setSettings({
                goName: get('grievance_officer_name', ''),
                goEmail: get('grievance_officer_email', ''),
                goPhone: get('grievance_officer_phone', ''),
                goSla: get('grievance_response_sla', '72 hours')
            });
        }
        if (logsData && logsData.logs) {
            setLogs(logsData.logs);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaveStatus('Saving...');
        const payload = {
            grievance_officer_name: settings.goName,
            grievance_officer_email: settings.goEmail,
            grievance_officer_phone: settings.goPhone,
            grievance_response_sla: settings.goSla
        };
        const res = await postJSON('/api/admin/site-settings', payload, 'PUT');
        if (res && res.success) {
            setSaveStatus('✅ Settings saved!');
            setTimeout(() => setSaveStatus(''), 3000);
        } else {
            setSaveStatus('❌ Failed to save');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading site settings...</div>;

    return (
        <div className="view active" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px 40px', flex: 1 }}>
            
            <div className="card">
                <div className="card-header">
                    <h3>Grievance Officer (DPDPA Section 13)</h3>
                </div>
                <div className="card-body padded">
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Configure the designated Grievance Officer details. These are displayed on the Privacy Notice page.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '700px', marginBottom: '20px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Officer Name</label>
                            <input 
                                type="text" value={settings.goName} onChange={e => setSettings({...settings, goName: e.target.value})} 
                                placeholder="e.g. John Doe" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Officer Email</label>
                            <input 
                                type="email" value={settings.goEmail} onChange={e => setSettings({...settings, goEmail: e.target.value})} 
                                placeholder="privacy@yourorg.in" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Officer Phone</label>
                            <input 
                                type="text" value={settings.goPhone} onChange={e => setSettings({...settings, goPhone: e.target.value})} 
                                placeholder="+91-XXXXXXXXXX" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Response SLA</label>
                            <input 
                                type="text" value={settings.goSla} onChange={e => setSettings({...settings, goSla: e.target.value})} 
                                placeholder="72 hours" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
                        {saveStatus && <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{saveStatus}</span>}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Audit Log (Recent)</h3>
                </div>
                <div className="card-body">
                    {logs.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs found.</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table" style={{ fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Target</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.slice(0, 50).map((l, i) => (
                                        <tr key={i}>
                                            <td style={{ color: 'var(--text-muted)' }}>{l.timestamp || '-'}</td>
                                            <td><strong>{l.username || '-'}</strong></td>
                                            <td><code style={{ background: 'var(--bg-hover)', padding: '2px 4px', borderRadius: '4px' }}>{l.action}</code></td>
                                            <td>{l.target_type || ''} {l.target_id || ''}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{l.details || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default SiteSettings;
