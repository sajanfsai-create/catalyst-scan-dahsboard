import React, { useState, useEffect } from 'react';
import { fetchJSON } from '../api';

const DBExplorer = () => {
    const [activeTable, setActiveTable] = useState('devices');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const tables = [
        'devices', 'organizations', 'licenses', 'users', 'partners', 'amc_records', 'alerts'
    ];

    useEffect(() => {
        loadTable(activeTable);
    }, [activeTable]);

    const loadTable = async (tableName) => {
        setLoading(true);
        setData(null);
        const result = await fetchJSON(`/api/admin/database/all/${tableName}`);
        if (result && Array.isArray(result)) {
            setData(result);
        } else if (result && result.error) {
            setData([]);
            alert(`Error: ${result.error}`);
        } else {
            setData([]);
        }
        setLoading(false);
    };

    return (
        <div className="view active" style={{ display: 'block', padding: '32px 40px', flex: 1 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3>Database Explorer</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {tables.map(t => (
                        <button 
                            key={t}
                            className={`btn ${activeTable === t ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTable(t)}
                        >
                            {t.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 style={{ textTransform: 'uppercase' }}>Table: {activeTable}</h3>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>Loading table data...</div>
                    ) : !data || data.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No rows found in table <strong>{activeTable}</strong>.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table" style={{ fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        {Object.keys(data[0]).map(key => (
                                            <th key={key}>{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((val, j) => {
                                                let displayVal = val;
                                                if (val === null) displayVal = <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span>;
                                                else if (typeof val === 'boolean') displayVal = val ? 'TRUE' : 'FALSE';
                                                else if (typeof val === 'object') displayVal = JSON.stringify(val);
                                                
                                                // Truncate long strings (like JSON blobs)
                                                if (typeof displayVal === 'string' && displayVal.length > 50) {
                                                    displayVal = displayVal.substring(0, 50) + '...';
                                                }

                                                return (
                                                    <td key={j} style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {displayVal}
                                                    </td>
                                                );
                                            })}
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

export default DBExplorer;
