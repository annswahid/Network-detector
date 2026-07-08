import signal
import psutil
import os

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
    print("Stopping threat simulation...")
    kill_process_by_name("simulate_threat.py")
    
    if os.path.exists("simulated_login.flag"):
        os.remove("simulated_login.flag")
        print("Removed simulation flag.")
        
    print("Done.")
