import os
import signal
import psutil

def kill_process_by_name(name):
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if name.lower() in proc.info['name'].lower() or \
               (proc.info['cmdline'] and any(name.lower() in arg.lower() for arg in proc.info['cmdline'])):
                print(f"Killing {proc.info['name']} (PID: {proc.info['pid']})")
                proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

if __name__ == "__main__":
    print("Stopping backend processes...")
    kill_process_by_name("node")
    kill_process_by_name("python")
    print("Done. You can now restart the backend.")
