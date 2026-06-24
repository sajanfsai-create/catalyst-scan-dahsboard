import React, { useState, useEffect } from 'react';
import { fetchJSON } from '../api';

const Downloads = () => {
    const [builds, setBuilds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDownloads();
    }, []);

    const loadDownloads = async () => {
        setLoading(true);
        const data = await fetchJSON('/api/partner/downloads');
        if (data && Array.isArray(data)) {
            setBuilds(data);
        }
        setLoading(false);
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading downloads...</div>;

    return (
        <div className="view active" style={{ display: 'block', padding: '32px 40px', flex: 1, maxWidth: '800px', margin: '0 auto' }}>
            
            <h2 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>My Downloads</h2>

            {builds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                    <p style={{ margin: 0, fontSize: '16px' }}>No packages available yet.</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Contact your administrator to build a package for your organization.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {builds.map(b => (
                        <div key={b.filename} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-soft)' }}>
                            <div>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>{b.filename}</strong>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                                    {b.size_mb} MB • {new Date(b.created).toLocaleDateString()}
                                </div>
                            </div>
                            <a href={`/api/public/download/${b.filename}`} className="btn btn-primary" download style={{ textDecoration: 'none' }}>
                                ⬇️ Download
                            </a>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};

export default Downloads;
