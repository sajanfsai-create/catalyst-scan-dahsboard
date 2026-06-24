import React from 'react';

const Placeholder = ({ title }) => {
    return (
        <div className="view active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px', opacity: 0.3 }}>🚧</div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Feature Coming Soon</h2>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '500px', marginBottom: '24px' }}>
                <strong>{title}</strong> is currently being migrated to React and will be available shortly.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={() => window.history.back()}>← Go Back</button>
            </div>
        </div>
    );
};

export default Placeholder;
