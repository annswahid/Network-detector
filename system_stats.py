import json
import os
import sys
import psutil

def get_system_stats():
    # cpu_percent with interval= blocks internally but is the CORRECT single-call way.
    # Use 1s — matches Task Manager standard and smooths out startup spikes.
    cpu_percent = psutil.cpu_percent(interval=1)

    mem = psutil.virtual_memory()
    root_path = os.path.abspath(os.sep)
    disk = psutil.disk_usage(root_path)

    # Single snapshot for network — no sleep needed here since cpu_percent already waited.
    net = psutil.net_io_counters()

    return {
        "cpu_usage": round(cpu_percent, 1),
        "memory_usage": round(mem.percent, 1),
        "disk": {
            "percent": round(disk.percent, 1)
        },
        # Without a delta we report cumulative — frontend should diff if needed.
        "network_tx": round(net.bytes_sent / 1024, 2),
        "network_rx": round(net.bytes_recv / 1024, 2),
        "source": "local"
    }

if __name__ == "__main__":
    try:
        print(json.dumps(get_system_stats()))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)