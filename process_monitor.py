import psutil
import json
import sys

# Get CPU core count once — used to normalize per-process CPU to 0-100%
CPU_CORES = psutil.cpu_count(logical=True) or 1

def get_processes():
    try:
        results = []
        for p in psutil.process_iter(['pid', 'name', 'username', 'memory_info']):
            try:
                cpu_raw = p.cpu_percent(interval=0.1)

                # Normalize: divide by core count so max is 100%
                # e.g. 136% on 4-core machine = 136/4 = 34%
                cpu = round(cpu_raw / CPU_CORES, 1)

                mem_info = p.info.get('memory_info')
                memory_mb = round(mem_info.rss / (1024 * 1024), 2) if mem_info else 0

                results.append({
                    'pid':    p.pid,
                    'name':   p.info['name'] or 'N/A',
                    'user':   p.info['username'] or 'N/A',
                    'cpu':    cpu,
                    'memory': memory_mb
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        sorted_processes = sorted(results, key=lambda x: x['cpu'], reverse=True)
        return sorted_processes[:20]

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        print(json.dumps(get_processes()))
    except Exception as e:
        print(json.dumps({"error": str(e)}))