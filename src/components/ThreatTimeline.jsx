import { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const POLL_SECONDS = 5;
const MAX_POINTS = (12 * 60) / POLL_SECONDS; // 144

const getColor = (score) => {
    if (score > 70) return {
        line: '#f43f5e',
        glow: 'rgba(244,63,94,0.5)',
        bg0: 'rgba(244,63,94,0.35)',
        bg1: 'rgba(244,63,94,0.0)',
        label: 'CRITICAL',
        badge: '#f43f5e'
    };
    if (score > 30) return {
        line: '#f59e0b',
        glow: 'rgba(245,158,11,0.5)',
        bg0: 'rgba(245,158,11,0.28)',
        bg1: 'rgba(245,158,11,0.0)',
        label: 'WARNING',
        badge: '#f59e0b'
    };
    return {
        line: '#10b981',
        glow: 'rgba(16,185,129,0.4)',
        bg0: 'rgba(16,185,129,0.2)',
        bg1: 'rgba(16,185,129,0.0)',
        label: 'SECURE',
        badge: '#10b981'
    };
};

const ThreatTimeline = ({ history: rawHistory }) => {
    const history = rawHistory.slice(-MAX_POINTS);

    const currentThreat = history.length > 0 ? history[history.length - 1].level : 0;
    const colors = getColor(currentThreat);

    const gradientRef = useRef(null);
    const gradientKey = colors.line;

    const labels = useMemo(() =>
        history.map((_, i) => {
            const totalPoints = history.length;
            const secsAgo = (totalPoints - 1 - i) * POLL_SECONDS;
            const minutesAgo = Math.floor(secsAgo / 60);
            if (i === totalPoints - 1) return 'Now';
            if (secsAgo > 0 && secsAgo % 120 === 0) return `-${minutesAgo}m`;
            return '';
        }),
        [history]);

    const data = useMemo(() => ({
        labels,
        datasets: [{
            label: 'Threat Level',
            data: history.map(h => h.level),
            fill: true,
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                if (!gradientRef.current || gradientRef.current.key !== gradientKey) {
                    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
                    gradient.addColorStop(0, colors.bg0);
                    gradient.addColorStop(1, colors.bg1);
                    gradientRef.current = { key: gradientKey, gradient };
                }
                return gradientRef.current.gradient;
            },
            borderColor: colors.line,
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: colors.line,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
        }],
    }), [history, labels, colors, gradientKey]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 150,
            easing: 'easeOutQuart',
        },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    maxTicksLimit: 7,
                    autoSkip: true,
                    font: { size: 10 },
                },
            },
            y: {
                display: true,
                min: 0,
                max: 100,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: {
                    color: '#64748b',
                    font: { size: 10 },
                    callback: (v) => `${v}%`,
                },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(10,15,30,0.95)',
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                borderColor: colors.line,
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: (ctx) => `Threat Level: ${ctx.parsed.y.toFixed(0)}%`,
                },
            },
        },
    }), [colors.line]);

    const isCritical = currentThreat > 70;
    const isWarning = currentThreat > 30 && currentThreat <= 70;

    // CSV Export — full 12 minute history
    const handleExportCSV = () => {
        const now = new Date();
        const peak = history.length > 0 ? Math.max(...history.map(h => h.level)) : 0;
        const avg = history.length > 0
            ? Math.round(history.reduce((s, h) => s + h.level, 0) / history.length)
            : 0;

        // CSV header
        const csvRows = [
            ['THREAT REPORT - LAST 12 MINUTES'],
            [`Generated,${now.toLocaleString()}`],
            [`Current Score,${currentThreat}%`],
            [`Peak Score,${peak}%`],
            [`Average Score,${avg}%`],
            [`Status,${isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'SECURE'}`],
            [`Total Data Points,${history.length}`],
            [],
            ['#', 'Time Offset', 'Timestamp', 'Threat Level (%)', 'Status', 'Threat Factors'],
        ];

        // CSV rows — one per data point
        history.forEach((point, i) => {
            const secsAgo = (history.length - 1 - i) * POLL_SECONDS;
            const minsAgo = Math.floor(secsAgo / 60);
            const secsPart = secsAgo % 60;
            const timeOffset = i === history.length - 1
                ? 'NOW'
                : `-${minsAgo}m ${secsPart}s`;

            const pointTime = new Date(now.getTime() - secsAgo * 1000);
            const timestamp = pointTime.toLocaleTimeString();

            const status = point.level > 70
                ? 'CRITICAL'
                : point.level > 30
                    ? 'WARNING'
                    : 'SECURE';

            const factors = point.breakdown && point.breakdown.length > 0
                ? `"${point.breakdown.join(' | ')}"`
                : 'None';

            csvRows.push([
                i + 1,
                timeOffset,
                timestamp,
                point.level,
                status,
                factors,
            ]);
        });

        const csvContent = csvRows
            .map(row => Array.isArray(row) ? row.join(',') : row)
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `threat-report-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{
            height: '100%', width: '100%', minHeight: '200px',
            position: 'relative', display: 'flex',
            flexDirection: 'column', gap: '0.75rem'
        }}>

            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem'
            }}>
                {/* Score + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        fontSize: '2rem', fontWeight: '800', color: colors.line,
                        textShadow: `0 0 16px ${colors.glow}`,
                        lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                        {currentThreat}
                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>%</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{
                            fontSize: '0.65rem', fontWeight: 800,
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                            color: colors.badge, padding: '0.2rem 0.6rem',
                            borderRadius: '999px', border: `1px solid ${colors.badge}`,
                            background: colors.bg0,
                            boxShadow: isCritical ? `0 0 12px ${colors.glow}` : 'none',
                            animation: isCritical ? 'threatPulse 1.2s ease-in-out infinite' : 'none',
                            display: 'inline-block'
                        }}>
                            {isCritical && '⚠ '}{colors.label}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {isCritical
                                ? 'Immediate action required'
                                : isWarning
                                    ? 'Elevated activity detected'
                                    : 'All systems nominal'}
                        </div>
                    </div>
                </div>

                {/* Stat pills + Export */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={pillStyle('#3b82f6')}>
                        <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Window</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>12 min</span>
                    </div>
                    <div style={pillStyle(colors.line)}>
                        <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Peak</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {history.length > 0 ? Math.max(...history.map(h => h.level)) : 0}%
                        </span>
                    </div>
                    <div style={pillStyle('#10b981')}>
                        <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avg</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {history.length > 0
                                ? Math.round(history.reduce((s, h) => s + h.level, 0) / history.length)
                                : 0}%
                        </span>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        style={{
                            ...pillStyle('#6366f1'),
                            cursor: 'pointer',
                            background: 'rgba(99,102,241,0.2)',
                            borderColor: '#6366f1',
                            color: '#e0e7ff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.35rem 1rem',
                            border: '1px solid #6366f1',
                            flexDirection: 'row',
                            gap: '0.4rem',
                            alignItems: 'center',
                        }}
                    >
                        ↓ Export CSV
                    </button>
                </div>
            </div>

            {/* Threat breakdown */}
            {(rawHistory.length > 0 && rawHistory[rawHistory.length - 1].breakdown && rawHistory[rawHistory.length - 1].breakdown.length > 0) && (
                <div style={{
                    fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(15,23,42,0.6)',
                    padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: `3px solid ${colors.line}`,
                    marginTop: '-0.25rem'
                }}>
                    <strong style={{ color: '#e2e8f0' }}>Why is the score high?</strong>
                    <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                        {rawHistory[rawHistory.length - 1].breakdown.map((factor, i) => (
                            <li key={i}>{factor}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Divider */}
            <div style={{ height: '1px', background: `linear-gradient(90deg, ${colors.line}44, transparent)` }} />

            {/* Chart */}
            <div style={{ flex: 1, minHeight: '140px', position: 'relative' }}>
                {history.length === 0 ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '100%', color: '#475569', fontSize: '0.9rem'
                    }}>
                        <span style={{ animation: 'threatPulse 2s ease-in-out infinite' }}>
                            ⟳ Collecting data…
                        </span>
                    </div>
                ) : (
                    <Line data={data} options={options} />
                )}
            </div>

            <style>{`
                @keyframes threatPulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 8px ${colors.glow}; }
                    50%       { opacity: 0.65; box-shadow: 0 0 20px ${colors.glow}; }
                }
            `}</style>
        </div>
    );
};

const pillStyle = (accentColor) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.35rem 0.7rem',
    borderRadius: '10px',
    border: `1px solid ${accentColor}33`,
    background: `${accentColor}11`,
    minWidth: '60px',
    gap: '0.1rem',
});

export default ThreatTimeline;