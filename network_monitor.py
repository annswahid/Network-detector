import psutil
import time
import json
import sys

def has_active_interface():
    try:
        for name, info in psutil.net_if_stats().items():
            if not info.isup:
                continue
            lower = name.lower()
            if lower.startswith('lo') or lower.startswith('loopback'):
                continue
            return True
    except Exception:
        return False
    return False

def get_network_speed():
    if not has_active_interface():
        return {"up": 0, "down": 0, "disconnected": True}

    # Two snapshots with 1s interval to calculate real speed (matches Task Manager)
    net1 = psutil.net_io_counters()
    time.sleep(1)
    net2 = psutil.net_io_counters()

    sent_kb = round(max(0, net2.bytes_sent - net1.bytes_sent) / 1024 / 1, 2)
    recv_kb = round(max(0, net2.bytes_recv - net1.bytes_recv) / 1024 / 1, 2)

    return {
        "up": sent_kb,
        "down": recv_kb,
        "disconnected": False
    }

if __name__ == "__main__":
    try:
        print(json.dumps(get_network_speed()))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)