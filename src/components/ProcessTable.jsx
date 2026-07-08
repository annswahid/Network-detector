import { memo, useMemo, useRef } from 'react';

const MAX_PROCESSES = Number(import.meta.env.VITE_MAX_PROCESSES) || 20;

const getCpuColor = (cpu) => {
    const val = parseFloat(cpu);
    if (val > 20) return '#f87171';
    if (val > 10) return '#fbbf24';
    return 'inherit';
};

const ProcessTable = memo(({ processes }) => {
    const lastValidProcesses = useRef([]);

    const topProcesses = useMemo(() => {
        if (processes && processes.length > 0) {
            const sorted = [...processes]
                .sort((a, b) => parseFloat(b.cpu) - parseFloat(a.cpu))
                .slice(0, MAX_PROCESSES);
            lastValidProcesses.current = sorted;
            return sorted;
        }
        return lastValidProcesses.current;
    }, [processes]);

    const isLoading = processes && processes.length === 0 && lastValidProcesses.current.length === 0;

    return (
        <div
            className="process-table-container"
            style={{
                maxHeight: '320px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                borderRadius: '0.75rem',
            }}
        >
            <table className="process-table">
                <thead>
                    <tr>
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(14,22,38,0.98)', backdropFilter: 'blur(10px)' }}>Name</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(14,22,38,0.98)', backdropFilter: 'blur(10px)' }}>PID</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(14,22,38,0.98)', backdropFilter: 'blur(10px)' }}>User</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(14,22,38,0.98)', backdropFilter: 'blur(10px)' }}>CPU %</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(14,22,38,0.98)', backdropFilter: 'blur(10px)' }}>Mem (MB)</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                Loading processes...
                            </td>
                        </tr>
                    ) : (
                        topProcesses.map((proc) => (
                            <tr key={proc.pid}>
                                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>{proc.name}</td>
                                <td style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>{proc.pid}</td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{proc.user}</td>
                                <td style={{ color: getCpuColor(proc.cpu), fontWeight: parseFloat(proc.cpu) > 10 ? 700 : 400 }}>
                                    {proc.cpu}
                                </td>
                                <td>{proc.memory}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
});

export default ProcessTable;