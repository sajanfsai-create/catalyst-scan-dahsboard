import React, { useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';
import { useAuth } from '../context/AuthContext';

const Builder = () => {
    const { user } = useAuth();
    const role = user?.role || 'org_user';
    const isSuperAdmin = role === 'super_admin';
    
    const [builds, setBuilds] = useState([]);
    const [buildHistory, setBuildHistory] = useState([]);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState([]);
    
    const [uploadProgress, setUploadProgress] = useState(-1);
    const [buildParams, setBuildParams] = useState({ org_id: '', telemetry_url: '', scan_limit: 2 });
    const [isBuilding, setIsBuilding] = useState(false);
    const [buildResult, setBuildResult] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [buildData, statusData, orgsData, historyData] = await Promise.all([
            fetchJSON('/api/build-exe/list'),
            fetchJSON('/api/build-exe/status'),
            fetchJSON('/api/dashboard/orgs'),
            fetchJSON('/api/build-exe/history'),
        ]);
        
        if (buildData && buildData.builds) setBuilds(buildData.builds);
        if (statusData) setStatus(statusData);
        if (orgsData && orgsData.organizations) setOrgs(orgsData.organizations);
        if (historyData && historyData.builds) setBuildHistory(historyData.builds);
        setLoading(false);
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/build-exe/upload', true);

        const authStr = sessionStorage.getItem('catalyst_auth');
        if (authStr) {
            try { xhr.setRequestHeader('Authorization', 'Bearer ' + JSON.parse(authStr).token); } catch(e) {}
        }

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setUploadProgress(100);
                setTimeout(() => {
                    setUploadProgress(-1);
                    loadData();
                }, 2000);
            } else {
                alert('Upload failed');
                setUploadProgress(-1);
            }
        };
        
        xhr.onerror = () => {
            alert('Upload network error');
            setUploadProgress(-1);
        };

        xhr.send(formData);
    };

    const handleBuild = async () => {
        if (!buildParams.org_id) return alert('Please select an Organization');
        const org = orgs.find(o => o.id === buildParams.org_id);
        
        setIsBuilding(true);
        setBuildResult(null);
        const payload = {
            org_id: org.id,
            org_name: org.name,
            telemetry_url: buildParams.telemetry_url,
            scan_limit: buildParams.scan_limit
        };

        const res = await postJSON('/api/build-exe', payload);
        if (res && res.success) {
            setBuildResult(res);
            loadData();
        } else {
            alert(res?.detail || 'Build failed — you may not have access to this organization.');
        }
        setIsBuilding(false);
    };

    const handleDelete = async (filename) => {
        if (!window.confirm(`Delete generated build "${filename}"?`)) return;
        const authStr = sessionStorage.getItem('catalyst_auth');
        const headers = {};
        if (authStr) headers['Authorization'] = 'Bearer ' + JSON.parse(authStr).token;

        const res = await fetch(`/api/build-exe/${filename}`, { method: 'DELETE', headers });
        if (res.ok) {
            loadData();
        } else {
            alert('Delete failed');
        }
    };

    const handleDownload = async (filename) => {
        const authStr = sessionStorage.getItem('catalyst_auth');
        const headers = {};
        if (authStr) headers['Authorization'] = 'Bearer ' + JSON.parse(authStr).token;

        try {
            const res = await fetch(`/api/build-exe/download/${filename}`, { headers });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Failed to download build.');
            }
        } catch (e) {
            alert('Download error');
        }
    };

    // Format credit display for org dropdown
    const orgLabel = (o) => {
        const credits = o.credit_balance ?? '?';
        const scans = typeof credits === 'number' ? credits : '?';
        return `${o.name} (₹${scans * 25} — ${scans} scans available)`;
    };

    return (
        <div className="view active" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px 40px', flex: 1 }}>
            
            {/* Base .exe Status — Super Admin Only */}
            {isSuperAdmin && (
                <div className="card">
                    <div className="card-header">
                        <h3>Executable Builder Setup</h3>
                    </div>
                    <div className="card-body padded">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h4>Base Executable Status</h4>
                                {status?.exists ? (
                                    <p style={{ color: 'var(--accent-green)', margin: 0 }}>✅ Base .exe ready ({status.size_mb} MB)</p>
                                ) : (
                                    <p style={{ color: 'var(--accent-red)', margin: 0 }}>❌ Base .exe missing</p>
                                )}
                            </div>
                            <div>
                                <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                                    ⬆️ Upload CatalystScan.exe
                                    <input type="file" accept=".exe" style={{ display: 'none' }} onChange={handleUpload} />
                                </label>
                            </div>
                        </div>
                        {uploadProgress >= 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '13px', marginBottom: '4px' }}>Uploading: {uploadProgress}%</div>
                                <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', transition: 'width 0.2s' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Non-admin status indicator */}
            {!isSuperAdmin && (
                <div className="card">
                    <div className="card-body padded" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {status?.exists ? (
                            <span style={{ color: 'var(--accent-green)' }}>✅ Base executable is ready — you can generate packages for your organizations.</span>
                        ) : (
                            <span style={{ color: 'var(--accent-red)' }}>❌ Base executable not uploaded yet. Contact your administrator.</span>
                        )}
                    </div>
                </div>
            )}

            {/* Generate Build */}
            <div className="card">
                <div className="card-header">
                    <h3>Generate Custom Build</h3>
                </div>
                <div className="card-body padded">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Target Organization *</label>
                            <select 
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                value={buildParams.org_id}
                                onChange={e => setBuildParams({...buildParams, org_id: e.target.value})}
                            >
                                <option value="">-- Select Organization --</option>
                                {orgs.map(o => (
                                    <option key={o.id} value={o.id}>{orgLabel(o)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Telemetry URL (Optional)</label>
                            <input 
                                type="text" placeholder="https://api.example.com/ingest"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                value={buildParams.telemetry_url}
                                onChange={e => setBuildParams({...buildParams, telemetry_url: e.target.value})}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Scans Per Device</label>
                            <input 
                                type="number" min="1"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                value={buildParams.scan_limit}
                                onChange={e => setBuildParams({...buildParams, scan_limit: parseInt(e.target.value) || 2})}
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleBuild} disabled={isBuilding || !status?.exists}>
                        {isBuilding ? 'Building...' : '🔨 Generate .exe Package'}
                    </button>

                    {/* Build success toast */}
                    {buildResult && (
                        <div style={{ 
                            marginTop: '16px', padding: '16px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            color: '#fff', fontSize: '14px'
                        }}>
                            <strong>✅ Build Successful!</strong>
                            <div style={{ marginTop: '8px', opacity: 0.9 }}>
                                <div>Version: <strong>{buildResult.build_version}</strong></div>
                                <div>Build ID: <code style={{ fontSize: '11px' }}>{buildResult.build_id?.substring(0, 16)}...</code></div>
                                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                                    ⚡ {buildResult.message}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Generated Builds */}
            <div className="card">
                <div className="card-header">
                    <h3>Generated Builds</h3>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>Loading builds...</div>
                    ) : builds.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No builds generated yet.</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Filename</th>
                                        <th>Size</th>
                                        <th>Created At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {builds.map(b => (
                                        <tr key={b.filename}>
                                            <td><strong>{b.filename}</strong></td>
                                            <td>{b.size_mb} MB</td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(b.created).toLocaleString()}</td>
                                            <td style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => handleDownload(b.filename)}>Download</button>
                                                {isSuperAdmin && (
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.filename)}>🗑</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Build History / Registry */}
            {buildHistory.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3>Build Registry</h3>
                    </div>
                    <div className="card-body">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Organization</th>
                                        <th>Version</th>
                                        <th>Build Fingerprint</th>
                                        <th>Scans/Device</th>
                                        <th>Built By</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {buildHistory.map(b => (
                                        <tr key={b.build_id}>
                                            <td><strong>{b.org_name}</strong></td>
                                            <td><span style={{ 
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                                                background: 'var(--primary)', color: '#fff' 
                                            }}>{b.build_version}</span></td>
                                            <td><code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.build_id?.substring(0, 16)}...</code></td>
                                            <td>{b.scan_limit}</td>
                                            <td>{b.built_by || '-'}</td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Builder;
