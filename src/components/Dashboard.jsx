import Header from './Header';
import MetricsChart from './MetricsChart';
import AttackPanel from './AttackPanel';
import LogViewer from './LogViewer';
import AlertsList from './AlertsList';
import ProcessTable from './ProcessTable';
import NetworkStats from './NetworkStats';
import DiskChart from './DiskChart';
import HealthScore from './HealthScore';
import RootkitRadar from './RootkitRadar';
import SysCallMatrix from './SysCallMatrix';
import ThreatTimeline from './ThreatTimeline';
import { useSystemData } from '../hooks/useSystemData';

const Dashboard = () => {
    const { metrics, logs, alerts, processes, network, disk, healthScore, securityStatus, syscalls, threatHistory, cpuSource } = useSystemData();

    // Calculate latest values for display
    const latestCpu = metrics.cpu.length > 0 ? metrics.cpu[metrics.cpu.length - 1] : 0;
    const latestMem = metrics.memory.length > 0 ? metrics.memory[metrics.memory.length - 1] : 0;
    const prevCpu = metrics.cpu.length > 1 ? metrics.cpu[metrics.cpu.length - 2] : latestCpu;
    const prevMem = metrics.memory.length > 1 ? metrics.memory[metrics.memory.length - 2] : latestMem;
    const cpuDelta = Number((latestCpu - prevCpu).toFixed(1));
    const memDelta = Number((latestMem - prevMem).toFixed(1));

    const healthTone = healthScore >= 85 ? 'good' : healthScore >= 60 ? 'warn' : 'bad';
    const alertTone = alerts.length === 0 ? 'good' : alerts.length < 5 ? 'warn' : 'bad';

    const summary = [
        { label: 'Health', value: `${healthScore}`, tone: healthTone },
        { label: 'Alerts', value: `${alerts.length}`, tone: alertTone },
        { label: 'Processes', value: `${processes.length}`, tone: 'neutral' },
    ];

    const updatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="dashboard-container">
            <Header title="System Monitor & Security Dashboard" summary={summary} updatedAt={updatedAt} />

            <div className="dashboard-grid">
                {/* --- Row 1: Vital Signs & Security --- */}

                {/* System Health Score - High Visibility */}
                <div className="panel health-panel">
                    <div className="vitals-wrap">
                        <div className="vitals-score">
                            <HealthScore score={healthScore} />
                            <div className="vitals-caption">
                                <p>Overall Health</p>
                                <span className={`delta ${healthTone}`}>{healthTone.toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="vitals-cards">
                            <div className="vital-card">
                                <div className="vital-header">
                                    <span>CPU Load</span>
                                    <span className={`delta ${cpuDelta > 0 ? 'warn' : 'good'}`}>
                                        {cpuDelta >= 0 ? `+${cpuDelta}` : cpuDelta}%
                                    </span>
                                </div>
                                <div className="vital-value">{latestCpu}%</div>
                                <div className="vital-bar">
                                    <div className="vital-bar-fill" style={{ width: `${Math.min(100, latestCpu)}%` }} />
                                </div>
                            </div>
                            <div className="vital-card">
                                <div className="vital-header">
                                    <span>Memory</span>
                                    <span className={`delta ${memDelta > 0 ? 'warn' : 'good'}`}>
                                        {memDelta >= 0 ? `+${memDelta}` : memDelta}%
                                    </span>
                                </div>
                                <div className="vital-value">{latestMem}%</div>
                                <div className="vital-bar">
                                    <div className="vital-bar-fill" style={{ width: `${Math.min(100, latestMem)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Metrics Graph */}
                <div className="panel metrics-panel">
                    <div className="panel-header">
                        <div>
                            <h2>
                                <span className="panel-badge" aria-label="live">Live</span> System Metrics
                            </h2>
                            <p className="panel-subtitle">Realtime CPU, memory, and throughput trends.</p>
                        </div>
                        <div className="metrics-stats">
                            <div className="metric-pill">
                                <span>CPU</span>
                                <strong>{latestCpu}%</strong>
                                <small>{cpuSource}</small>
                            </div>
                            <div className="metric-pill">
                                <span>Memory</span>
                                <strong>{latestMem}%</strong>
                            </div>
                        </div>
                    </div>
                    <MetricsChart data={metrics} />
                </div>

                {/* Security Radar */}
                <div className="panel security-panel">
                    <h2>
                        <span role="img" aria-label="shield">🛡️</span> Security Radar
                    </h2>
                    <RootkitRadar status={securityStatus} />
                </div>

                {/* --- Row 2: Deep Analysis --- */}

                {/* Threat Timeline (Full Width) */}
                <div className="panel threat-panel">
                    <h2>
                        <span role="img" aria-label="scope">🎯</span> Threat Detection (12m Window)
                    </h2>
                    <ThreatTimeline history={threatHistory} />
                </div>

                {/* Disk Usage */}
                <div className="panel disk-panel">
                    <h2>
                        <span role="img" aria-label="disk">💾</span> Storage
                    </h2>
                    <DiskChart disk={disk} />
                </div>

                {/* --- Row 3: Kernel & Network --- */}

                {/* SysCall Matrix (Tall Panel) */}
                <div className="panel syscall-panel">
                    <h2>
                        <span role="img" aria-label="chip">💾</span> Kernel Syscalls
                    </h2>
                    <SysCallMatrix syscalls={syscalls} />
                </div>

                {/* Network Stats */}
                <div className="panel network-panel">
                    <h2>
                        <span role="img" aria-label="network">🌐</span> Network Flow
                    </h2>
                    <NetworkStats data={network} />
                </div>

                {/* Attack Panel (Live Ops) */}
                <div className="panel attack-panel">
                    <AttackPanel alerts={alerts} processes={processes} securityStatus={securityStatus} connectionCount={securityStatus.connectionCount || 0} />
                </div>

                {/* --- Row 4: Administration --- */}

                {/* Process Table */}
                <div className="panel processes-panel">
                    <h2>
                        <span role="img" aria-label="gear">⚙️</span> Active Processes
                    </h2>
                    <ProcessTable processes={processes} />
                </div>

                {/* Alerts List */}
                <div className="panel alerts-panel">
                    <h2>
                        <span role="img" aria-label="warning">⚠️</span> Alerts
                    </h2>
                    <AlertsList alerts={alerts} />
                </div>

                {/* Logs Viewer */}
                <div className="panel logs-panel">
                    <h2>
                        <span role="img" aria-label="scroll">📜</span> System Logs
                    </h2>
                    <LogViewer logs={logs} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;


