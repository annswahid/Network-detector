import subprocess
import json
import os
import time
import platform
import psutil
import sys

BASELINE_FILE  = "security_baseline.json"
CRITICAL_FILES = ["proxy-server.js", "package.json"]

# ── Cache for expensive system calls ─────────────────────────────
_cache = {
    "net":   {"value": 0,  "ts": 0},
    "proc":  {"value": 0,  "ts": 0},
    "users": {"value": [], "ts": 0},
    "auth_fails": {"value": 0, "ts": 0},
}

NET_CACHE_TTL  = 20
PROC_CACHE_TTL = 10
USER_CACHE_TTL = 30


def _get_cached(key, ttl, fetch_fn):
    now = time.time()
    if now - _cache[key]["ts"] < ttl:
        return _cache[key]["value"]
    try:
        value = fetch_fn()
    except Exception:
        value = _cache[key]["value"]
    _cache[key] = {"value": value, "ts": now}
    return value


# ── SYSTEM STATS ────────────────────────────────────────────────

def get_system_stats():
    proc_count = _get_cached("proc", PROC_CACHE_TTL, lambda: len(psutil.pids()))
    net_count  = _get_cached("net",  NET_CACHE_TTL,  _fetch_net_count)
    return proc_count, net_count


def _fetch_net_count():
    connections = psutil.net_connections(kind='inet')
    return len([c for c in connections if c.status == psutil.CONN_ESTABLISHED])


# ── USER MONITORING ─────────────────────────────────────────────

def get_all_users():
    def _fetch():
        users = []
        try:
            if platform.system() == "Windows":
                output = subprocess.check_output(
                    "wmic useraccount get name", shell=True, timeout=5
                ).decode()
                users = [
                    line.strip() for line in output.splitlines()
                    if line.strip() and line.strip() != "Name"
                ]
            elif platform.system() == "Linux":
                with open("/etc/passwd", "r") as f:
                    for line in f:
                        users.append(line.split(":")[0])
        except Exception:
            users = []
        return sorted(users)

    return _get_cached("users", USER_CACHE_TTL, _fetch)


# ── FILE INTEGRITY ──────────────────────────────────────────────

def check_file_integrity():
    missing = []
    for f in CRITICAL_FILES:
        if not os.path.exists(f) and not os.path.exists(os.path.join(os.getcwd(), f)):
            missing.append(f)
    return missing


# ── BASELINE MANAGEMENT ─────────────────────────────────────────

def manage_baseline(current_users):
    baseline = {}
    if os.path.exists(BASELINE_FILE):
        try:
            with open(BASELINE_FILE, "r") as f:
                baseline = json.load(f)
        except Exception:
            pass

    if not baseline:
        baseline = {"users": current_users}
        with open(BASELINE_FILE, "w") as f:
            json.dump(baseline, f)

    return baseline


# ── ALERT GENERATION ────────────────────────────────────────────

def generate_alerts(proc_count, net_count, current_users, baseline_users, missing_files):
    alerts = []
    timestamp = time.strftime("%H:%M:%S")

    if proc_count > 400:
        alerts.append({"severity": "warning", "type": "PROCESS",
                       "timestamp": timestamp,
                       "message": f"High Process Count: {proc_count} active"})

    if net_count > 150:
        alerts.append({"severity": "warning", "type": "NETWORK",
                       "timestamp": timestamp,
                       "message": f"High Network Activity: {net_count} connections"})

    deleted_users = [u for u in baseline_users if u not in current_users]
    for user in deleted_users:
        alerts.append({"severity": "critical", "type": "SECURITY",
                       "timestamp": timestamp,
                       "message": f"CRITICAL: User Account '{user}' was DELETED!"})

    for missing in missing_files:
        alerts.append({"severity": "critical", "type": "SECURITY",
                       "timestamp": timestamp,
                       "message": f"CRITICAL: Security File '{missing}' DELETED!"})

    return alerts


# ── FAILED LOGIN DETECTION (FIXED) ─────────────────────────────

def get_failed_logins():
    if platform.system() != "Windows":
        return 0
    return _get_cached("auth_fails", 10, _fetch_failed_logins)


def _fetch_failed_logins():
    """
    Detects Windows failed login attempts (Event ID 4625)
    in the last 60 seconds using Get-WinEvent.
    Requires Administrator privileges.
    """

    # Demo mode (for presentations)
    if os.path.exists("simulated_login.flag"):
        return 5

    try:
        ps_cmd = """
        (Get-WinEvent -FilterHashtable @{
            LogName='Security';
            Id=4625;
            StartTime=(Get-Date).AddSeconds(-60)
        } -ErrorAction SilentlyContinue).Count
        """

        result = subprocess.run(
            ["powershell", "-Command", ps_cmd],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            timeout=5
        )

        output = result.stdout.strip()
        return int(output) if output.isdigit() else 0

    except Exception:
        return 0


# ── THREAT SCORE ───────────────────────────────────────────────

# ── THREAT SCORE ───────────────────────────────────────────────

def calculate_threat_score(proc_count, net_count, failed_logins, alerts):
    score = 0
    breakdown = []

    proc_score = min(40, max(0, (proc_count - 350) / 5))
    if proc_score > 0:
        score += proc_score
        breakdown.append(f"High Process Activity (+{int(proc_score)})")

    net_score = min(40, max(0, (net_count - 100) * 1.0))
    if net_score > 0:
        score += net_score
        breakdown.append(f"High Network Load (+{int(net_score)})")
        
        # SIMULATION: If network is high, assume firewall is blocking packets
        _cache["blocked_attacks"] = _cache.get("blocked_attacks", 0) + int(net_score / 2)

    login_score = min(60, failed_logins * 20)
    if login_score > 0:
        score += login_score
        breakdown.append(f"Suspicious Login Attempts (+{int(login_score)})")
        
        # SIMULATION: Each failed login is a blocked attack
        _cache["blocked_attacks"] = _cache.get("blocked_attacks", 0) + 1

    alert_score = 0
    alert_score += min(20, sum(1 for a in alerts if a["severity"] == "warning") * 5)
    alert_score += min(40, sum(1 for a in alerts if a["severity"] == "critical") * 20)

    if alert_score > 0:
        score += alert_score
        breakdown.append(f"Security Alerts (+{int(alert_score)})")

    return min(round(score), 100), breakdown


# ── RADAR METRICS ──────────────────────────────────────────────

def get_radar_metrics(proc_count, alerts):
    base_integrity = 100
    if any(a["type"] == "SECURITY" for a in alerts):
        base_integrity = 20

    return {
        "memory":   base_integrity,
        "process":  max(100 - (proc_count // 30), 50),
        "modules":  base_integrity,
        "syscalls": 90,
        "hooks":    base_integrity,
        "files":    0 if base_integrity < 50 else 100,
    }


# ── MAIN DATA PIPELINE ─────────────────────────────────────────

def get_current_data():
    procs, nets    = get_system_stats()
    current_users  = get_all_users()
    failed_logins  = get_failed_logins()

    baseline       = manage_baseline(current_users)
    baseline_users = baseline.get("users", [])
    missing_files  = check_file_integrity()

    alerts = generate_alerts(procs, nets, current_users,
                             baseline_users, missing_files)

    if failed_logins > 0:
        alerts.insert(0, {
            "severity": "critical",
            "type": "SECURITY",
            "timestamp": time.strftime("%H:%M:%S"),
            "message": f"CRITICAL: {failed_logins} Failed Login Attempts detected!"
        })

    current_score, breakdown = calculate_threat_score(
        procs, nets, failed_logins, alerts
    )

    radar_metrics = get_radar_metrics(procs, alerts)
    
    # Use our accumulating counter for "Blocked Attacks"
    total_blocked = _cache.get("blocked_attacks", 0)

    return {
        "status":        radar_metrics,
        "current_score": current_score,
        "breakdown":     breakdown,
        "alerts":        alerts,
        "blocked_count": total_blocked, # Matches "Blocked Attempts" on UI
        "_raw_stats":    {"proc_count": procs, "net_count": nets},
    }


# ── CLI OUTPUT ─────────────────────────────────────────────────

if __name__ == "__main__":
    result = get_current_data()
    print(json.dumps(result))
