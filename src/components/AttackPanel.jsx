import { useMemo } from 'react';

const AttackPanel = ({ alerts = [], processes = [], securityStatus = {}, connectionCount = 0 }) => {

    // Calculate metrics
    const activeThreats = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;
    const suspiciousProcs = processes.filter(p => parseFloat(p.cpu) > 20).length;
    const blockedAttempts = securityStatus.threatsBlocked || 0;

    // Count failed logins from alerts (looking for "Failed Login" or specific type)
    const failedLogins = alerts.filter(a =>
        (a.type === 'SECURITY' && a.message.includes('Failed Login')) ||
        (a.message && a.message.includes('Brute Force'))
    ).length;

    // Get recent events (last 3)
    const recentEvents = useMemo(() => {
        return [...alerts].sort((a, b) => {
            // unexpected timestamp formats handling
            return new Date('1970/01/01 ' + b.timestamp) - new Date('1970/01/01 ' + a.timestamp);
        }).slice(0, 3);
    }, [alerts]);

    return (
        <div style={{
            height: '100%', width: '100%',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '0.75rem', padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '1rem',
            border: '1px solid #334155',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🛡️</span> Real-Time Attack Panel
                </h3>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.2rem 0.6rem', borderRadius: '99px'
                }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444',
                        boxShadow: '0 0 8px #ef4444', animation: 'pulse 1.5s infinite'
                    }} />
                    <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>LIVE MONITORING</span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: 1 }}>
                <MetricCard
                    label="Live Connections"
                    value={connectionCount}
                    color="#f59e0b" // Amber
                    icon="🌐"
                    sublabel="Active Sockets"
                />
                <MetricCard
                    label="Suspicious Procs"
                    value={suspiciousProcs}
                    color="#eab308" // Yellow
                    icon="⚙️"
                    sublabel="CPU > 20%"
                />
                <MetricCard
                    label="Failed Logins"
                    value={failedLogins}
                    color="#ef4444" // Red
                    icon="⛔"
                />
                <MetricCard
                    label="Blocked Attacks"
                    value={blockedAttempts}
                    color="#10b981" // Emerald
                    icon="🛡️"
                />
            </div>

            {/* Recent Event Stream (Mini) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Latest Activity
                </div>
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.4rem',
                    minHeight: '80px', maxHeight: '100px', overflowY: 'auto'
                }}>
                    {recentEvents.length > 0 ? (
                        recentEvents.map((e, i) => (
                            <div key={i} style={{
                                fontSize: '0.75rem', padding: '0.4rem', borderRadius: '4px',
                                background: 'rgba(0,0,0,0.2)', borderLeft: `3px solid ${getSeverityColor(e.severity)}`,
                                color: '#e2e8f0', display: 'flex', justifyContent: 'space-between'
                            }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                    {e.message}
                                </span>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{e.timestamp}</span>
                            </div>
                        ))
                    ) : (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem' }}>
                            No recent security events detected.
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

const MetricCard = ({ label, value, color, icon, sublabel }) => (
    <div style={{
        background: `linear-gradient(135deg, ${color}11 0%, rgba(255,255,255,0.03) 100%)`,
        border: `1px solid ${color}33`, borderRadius: '0.5rem',
        padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.9rem' }}>{icon}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
            {value}
        </div>
        {sublabel && (
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem' }}>{sublabel}</div>
        )}
    </div>
);

const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
        case 'critical': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#3b82f6';
    }
};

export default AttackPanel;
