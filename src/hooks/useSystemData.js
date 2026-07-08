import { useState, useEffect, useRef, useCallback } from 'react';

const POLLING_INTERVAL = Number(import.meta.env.VITE_POLLING_INTERVAL) || 5000;
const MAX_METRICS = Number(import.meta.env.VITE_MAX_METRICS) || 20;
const MAX_LOGS = Number(import.meta.env.VITE_MAX_LOGS) || 50;
const MAX_ALERTS = Number(import.meta.env.VITE_MAX_ALERTS) || 50;
const MAX_SYSCALLS = Number(import.meta.env.VITE_MAX_SYSCALLS) || 30;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MAX_ALERT_IDS = 200;

const POLL_SECONDS = POLLING_INTERVAL / 1000;
const MAX_THREAT_PTS = Math.round((12 * 60) / POLL_SECONDS);

const fetchWithTimeout = (url, ms, fallback) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .catch(() => fallback)
    .finally(() => clearTimeout(timer));
};

const calculateHealthScore = (cpu, mem, diskPercent, threatScore = 0) => {
  let score = 100;
  if (cpu > 70) score -= (cpu - 70) * 1.5;
  if (mem > 80) score -= (mem - 80) * 1.2;
  if (diskPercent > 90) score -= 15;
  score -= Math.round((threatScore / 100) * 30);
  return Math.max(Math.floor(score), 0);
};

export const useSystemData = () => {
  const [metrics, setMetrics] = useState({ cpu: [], memory: [], timestamps: [] });
  const [cpuSource, setCpuSource] = useState('unknown');
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [network, setNetwork] = useState({ up: [], down: [], timestamps: [], currentUp: 0, currentDown: 0, status: 'unknown' });
  const [disk, setDisk] = useState({ used: 0, free: 0, total: 0 });
  const [healthScore, setHealthScore] = useState(100);
  const [securityStatus, setSecurityStatus] = useState({
    status: 'secure',
    lastScan: 'Pending...',
    threatsBlocked: 0,
    firewall: 'active',
    connectionCount: 0,   // ← always initialised here
  });
  const [syscalls, setSyscalls] = useState([]);
  const [threatHistory, setThreatHistory] = useState([]);

  const isFetchingRef = useRef(false);
  const lastAlertTime = useRef({});
  const alertIdSet = useRef(new Set());
  const alertIdOrder = useRef([]);
  const lastProcessSignature = useRef('');
  const lastSyscallTs = useRef(0);
  const lastThreatScore = useRef(null);

  const addAlerts = useCallback((incoming) => {
    const next = [];
    for (const alert of incoming) {
      const id = alert.id || `${alert.type || 'X'}-${alert.timestamp || ''}-${alert.message || ''}`;
      if (alertIdSet.current.has(id)) continue;

      alertIdSet.current.add(id);
      alertIdOrder.current.push(id);
      next.push({ ...alert, id });

      if (alertIdOrder.current.length > MAX_ALERT_IDS) {
        const removed = alertIdOrder.current.shift();
        alertIdSet.current.delete(removed);
      }
    }
    if (next.length > 0) {
      setAlerts(prev => [...next, ...prev].slice(0, MAX_ALERTS));
    }
  }, []);

  const checkSmartAlerts = useCallback((cpu, mem, diskPercent, netDown, procCount, highCpuProcs) => {
    const now = Date.now();
    const cooldown = 10000;
    const newAlerts = [];

    const maybe = (key, condition, alert) => {
      if (condition && (!lastAlertTime.current[key] || now - lastAlertTime.current[key] > cooldown)) {
        newAlerts.push({ id: now + key, ...alert, timestamp: new Date().toLocaleTimeString() });
        lastAlertTime.current[key] = now;
      }
    };

    maybe('cpu', cpu > 90, { severity: 'critical', type: 'SYSTEM', message: 'CRITICAL: CPU Overload Detected (>90%)' });
    maybe('mem', mem > 85, { severity: 'warning', type: 'SYSTEM', message: 'Warning: Memory Usage High (Potential Leak)' });
    maybe('disk', diskPercent > 90, { severity: 'warning', type: 'SYSTEM', message: `Warning: Disk Space Low (${diskPercent}% used)` });
    maybe('net', netDown > 5000, { severity: 'warning', type: 'NETWORK', message: `Network Anomaly: High Download (${(netDown / 1024).toFixed(1)} MB/s)` });
    maybe('proc_high', highCpuProcs > 0, { severity: 'critical', type: 'PROCESS', message: 'Security Alert: Suspicious High-CPU Process Detected' });
    maybe('proc_count', procCount > 200, { severity: 'warning', type: 'PROCESS', message: `Warning: High Process Count (${procCount} active)` });

    return newAlerts;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const now = new Date().toLocaleTimeString();

      try {
        const [
          data, logsData, syscallsData, diskData,
          threatData, netFlowData, processesData, fileEventsData
        ] = await Promise.all([
          fetchWithTimeout(`${API_BASE}/api/stats`, 8000, { error: 'timeout' }),
          fetchWithTimeout(`${API_BASE}/api/logs`, 5000, []),
          fetchWithTimeout(`${API_BASE}/api/syscalls`, 6000, { error: 'timeout' }),
          fetchWithTimeout(`${API_BASE}/api/local-disk`, 6000, { error: 'timeout' }),
          fetchWithTimeout(`${API_BASE}/api/threat-history`, 10000, { error: 'timeout' }),
          fetchWithTimeout(`${API_BASE}/api/network-flow`, 6000, { error: 'timeout' }),
          fetchWithTimeout(`${API_BASE}/api/processes`, 6000, []),
          fetchWithTimeout(`${API_BASE}/api/file-events`, 5000, { error: 'timeout' }),
        ]);

        // ── Processes ─────────────────────────────────────────────────
        if (Array.isArray(processesData) && processesData.length > 0) {
          const sig = `${processesData.length}|` +
            processesData.slice(0, 10).map(p => `${p.pid}:${p.cpu}:${p.memory}`).join('|');
          if (sig !== lastProcessSignature.current) {
            lastProcessSignature.current = sig;
            setProcesses(processesData);
          }
        }

        // ── Main stats ────────────────────────────────────────────────
        let cpu = 0, mem = 0, diskPct = 0, threatScore = 0;

        if (data && !data.error) {
          cpu = data.cpu_usage ?? 0;
          mem = data.memory_usage ?? 0;
          diskPct = data.disk?.percent ?? 0;
          threatScore = threatData?.current_score ?? 0;

          setMetrics(prev => ({
            timestamps: [...prev.timestamps, now].slice(-MAX_METRICS),
            cpu: [...prev.cpu, cpu].slice(-MAX_METRICS),
            memory: [...prev.memory, mem].slice(-MAX_METRICS),
          }));

          setCpuSource(data.cpu_source || data.source || 'local');
          setHealthScore(calculateHealthScore(cpu, mem, diskPct, threatScore));

          // Update threat status — do NOT spread threatData.status here
          // to avoid overwriting connectionCount with radar fields
          setSecurityStatus(prev => ({
            ...prev,
            status: threatScore > 70 ? 'critical' : threatScore > 30 ? 'warning' : 'secure',
            lastScan: now,
          }));
        }

        // ── Logs ──────────────────────────────────────────────────────
        if (Array.isArray(logsData) && logsData.length > 0) {
          setLogs(logsData.slice(-MAX_LOGS));
        }

        // ── Disk ──────────────────────────────────────────────────────
        if (diskData && !diskData.error) {
          setDisk(prev =>
            prev.used === diskData.used && prev.free === diskData.free ? prev : diskData
          );
        }

        // ── Threat history + connectionCount ──────────────────────────
        if (threatData && !threatData.error) {

          // Always update connectionCount + threatsBlocked from _raw_stats
          // regardless of whether status block exists
          const netCount = threatData._raw_stats?.net_count ?? null;
          const blockedCount = threatData.blocked_count ?? null;

          setSecurityStatus(prev => ({
            ...prev,
            ...(netCount !== null && { connectionCount: netCount }),
            ...(blockedCount !== null && { threatsBlocked: blockedCount }),
            // Store radar metrics separately so they don't clash
            radarMetrics: threatData.status || prev.radarMetrics,
            lastScan: now,
          }));

          // Threat history
          if (Array.isArray(threatData.history) && threatData.history.length > 0) {
            setThreatHistory(threatData.history.slice(-MAX_THREAT_PTS));
          } else if (typeof threatData.current_score === 'number') {
            const score = threatData.current_score;
            if (lastThreatScore.current !== score) {
              lastThreatScore.current = score;
            }
            setThreatHistory(prev =>
              [...prev, { level: score, breakdown: threatData.breakdown || [] }].slice(-MAX_THREAT_PTS)
            );
          }
        }

        // ── Network ───────────────────────────────────────────────────
        const netSource = netFlowData && !netFlowData.error ? netFlowData : null;
        if (netSource) {
          const isDisc = netSource.disconnected === true;
          const upVal = isDisc ? 0 : netSource.up;
          const downVal = isDisc ? 0 : netSource.down;
          setNetwork(prev => {
            if (prev.currentUp === upVal && prev.currentDown === downVal) return prev;
            return {
              timestamps: [...prev.timestamps, now].slice(-MAX_METRICS),
              up: [...prev.up, upVal].slice(-MAX_METRICS),
              down: [...prev.down, downVal].slice(-MAX_METRICS),
              currentUp: upVal,
              currentDown: downVal,
              status: isDisc ? 'disconnected' : 'online',
            };
          });
        } else if (data && !data.error) {
          const upVal = data.network_tx ?? 0;
          const downVal = data.network_rx ?? 0;
          setNetwork(prev => {
            if (prev.currentUp === upVal && prev.currentDown === downVal) return prev;
            return {
              timestamps: [...prev.timestamps, now].slice(-MAX_METRICS),
              up: [...prev.up, upVal].slice(-MAX_METRICS),
              down: [...prev.down, downVal].slice(-MAX_METRICS),
              currentUp: upVal,
              currentDown: downVal,
              status: 'fallback',
            };
          });
        }

        // ── Syscalls ──────────────────────────────────────────────────
        if (Array.isArray(syscallsData) && syscallsData.length > 0) {
          const latestTs = syscallsData[syscallsData.length - 1].timestamp;
          if (latestTs !== lastSyscallTs.current) {
            lastSyscallTs.current = latestTs;
            setSyscalls(syscallsData.slice(-MAX_SYSCALLS));
          }
        }

        // ── Alerts ────────────────────────────────────────────────────
        const combinedAlerts = [
          ...(data?.alerts || []),
          ...(threatData?.alerts || []),
        ];

        const fileEvents = (fileEventsData?.events || [])
          .filter(e => e && typeof e.timestamp === 'number')
          .sort((a, b) => a.timestamp - b.timestamp);

        for (const e of fileEvents) {
          combinedAlerts.push({
            id: `file-${e.timestamp}-${e.path}`,
            severity: e.type === 'deleted' ? 'warning' : 'info',
            type: 'FILE',
            message: `File ${e.type}: ${e.path}`,
            timestamp: e.time || new Date(e.timestamp).toLocaleTimeString(),
          });
        }

        if (data && !data.error) {
          combinedAlerts.push(...checkSmartAlerts(
            data.cpu_usage ?? 0,
            data.memory_usage ?? 0,
            diskData?.usedPercent || data.disk?.percent || 0,
            data.network_rx ?? 0,
            processesData?.length || 0,
            processesData?.filter(p => parseFloat(p.cpu) > 20).length || 0,
          ));
        }

        addAlerts(combinedAlerts);

      } catch (err) {
        console.error('Fetch cycle error:', err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    const interval = setInterval(fetchData, POLLING_INTERVAL);
    fetchData();
    return () => clearInterval(interval);

  }, [addAlerts, checkSmartAlerts]);

  return {
    metrics, logs, alerts, processes, network,
    disk, healthScore, securityStatus, syscalls,
    threatHistory, cpuSource,
    connectionCount: securityStatus.connectionCount || 0,
  };
};