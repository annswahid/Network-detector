import { useState, useEffect, useRef, useMemo, memo } from 'react';
import './AlertsList.css';

const AlertsList = memo(({ alerts }) => {
    const [filter, setFilter] = useState('all'); // all, critical, warning
    const alertsEndRef = useRef(null);
    const [animate, setAnimate] = useState(false);

    // Animate new alerts (without scrolling the page)
    useEffect(() => {
        if (alerts && alerts.length > 0) {
            setAnimate(true);
            setTimeout(() => setAnimate(false), 500);
        }
    }, [alerts]);

    // Get severity icon and color
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
                return { icon: '??', label: 'CRITICAL', class: 'critical' };
            case 'warning':
                return { icon: '??', label: 'WARNING', class: 'warning' };
            case 'info':
                return { icon: '??', label: 'INFO', class: 'info' };
            default:
                return { icon: '??', label: 'NOTICE', class: 'notice' };
        }
    };

    // Get type badge
    const getTypeBadge = (type) => {
        const badges = {
            'PROCESS': { icon: '??', color: '#3b82f6' },
            'NETWORK': { icon: '??', color: '#8b5cf6' },
            'SECURITY': { icon: '??', color: '#ef4444' },
            'FILE': { icon: '??', color: '#f59e0b' },
            'USER': { icon: '??', color: '#10b981' },
            'SYSTEM': { icon: '??', color: '#6366f1' }
        };
        return badges[type] || { icon: '??', color: '#64748b' };
    };

    // Filter alerts
    const filteredAlerts = useMemo(() => {
        if (!alerts) return [];
        if (filter === 'all') return alerts;
        return alerts.filter(alert => alert.severity === filter);
    }, [alerts, filter]);

    // Count by severity
    const criticalCount = useMemo(() => (alerts || []).filter(a => a.severity === 'critical').length, [alerts]);
    const warningCount = useMemo(() => (alerts || []).filter(a => a.severity === 'warning').length, [alerts]);

    if (!alerts || alerts.length === 0) {
        return (
            <div className="alerts-list-empty">
                <div className="empty-state">
                    <span className="empty-icon">?</span>
                    <p>No active alerts</p>
                    <span className="empty-subtitle">System is secure</span>
                </div>
            </div>
        );
    }

    return (
        <div className="alerts-list-container">
            {/* Header with filters and stats */}
            <div className="alerts-header">
                <div className="alerts-stats">
                    <span className="stat-badge critical-badge">
                        ?? {criticalCount}
                    </span>
                    <span className="stat-badge warning-badge">
                        ?? {warningCount}
                    </span>
                    <span className="stat-badge total-badge">
                        Total: {alerts.length}
                    </span>
                </div>

                <div className="alerts-filters">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
                        onClick={() => setFilter('critical')}
                    >
                        Critical
                    </button>
                    <button
                        className={`filter-btn ${filter === 'warning' ? 'active' : ''}`}
                        onClick={() => setFilter('warning')}
                    >
                        Warning
                    </button>
                </div>
            </div>

            {/* Alerts list */}
            <div className="alerts-list">
                {filteredAlerts.length === 0 ? (
                    <div className="no-alerts-filtered">
                        No {filter} alerts
                    </div>
                ) : (
                    filteredAlerts.map((alert, index) => {
                        const severity = getSeverityIcon(alert.severity);
                        const typeBadge = getTypeBadge(alert.type);
                        const isNew = index === filteredAlerts.length - 1 && animate;

                        return (
                            <div
                                key={`${alert.timestamp}-${index}`}
                                className={`alert-item alert-${severity.class} ${isNew ? 'alert-new' : ''}`}
                            >
                                <div className="alert-severity-indicator">
                                    <span className="severity-icon">{severity.icon}</span>
                                </div>

                                <div className="alert-content">
                                    <div className="alert-header">
                                        <div className="alert-badges">
                                            <span
                                                className="alert-type-badge"
                                                style={{ backgroundColor: typeBadge.color }}
                                            >
                                                {typeBadge.icon} {alert.type}
                                            </span>
                                            <span className="alert-severity-badge">
                                                {severity.label}
                                            </span>
                                        </div>
                                        <span className="alert-time">{alert.timestamp}</span>
                                    </div>

                                    <div className="alert-message">
                                        {alert.message}
                                    </div>
                                </div>

                                {/* Pulse effect for critical alerts */}
                                {alert.severity === 'critical' && (
                                    <div className="alert-pulse"></div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={alertsEndRef} />
            </div>

            {/* Footer info */}
            {alerts.length > filteredAlerts.length && (
                <div className="alerts-footer">
                    Showing {filteredAlerts.length} of {alerts.length} alerts
                </div>
            )}
        </div>
    );
});

export default AlertsList;
