import subprocess
import time
import sys
import random
import threading

class ThreatSimulator:
    def __init__(self):
        self.running = True
        self.process_pool = []
        self.network_pool = []
        self.threat_level = "LOW"  # LOW, MEDIUM, HIGH
        
    def cleanup(self):
        """Clean up all spawned processes"""
        print("\n🧹 Cleaning up simulation processes...")
        for p in self.process_pool:
            try:
                p.terminate()
            except:
                pass
        for p in self.network_pool:
            try:
                p.terminate()
            except:
                pass
        
        # Remove simulation flag
        try:
            import os
            if os.path.exists("simulated_login.flag"):
                os.remove("simulated_login.flag")
        except:
            pass

        self.process_pool.clear()
        self.network_pool.clear()
        print("✅ Cleanup complete.")
    
    def simulate_process_spike(self, count):
        """Spawn dummy processes to simulate suspicious activity"""
        # Clean up dead processes first
        self.process_pool = [p for p in self.process_pool if p.poll() is None]
        
        # Spawn new processes
        for i in range(count):
            try:
                # Use timeout command (harmless, just waits)
                p = subprocess.Popen(
                    ["timeout", "30"], 
                    shell=True, 
                    stdout=subprocess.DEVNULL, 
                    stderr=subprocess.DEVNULL
                )
                self.process_pool.append(p)
            except:
                pass
    
    def simulate_network_activity(self, count):
        """Generate network connections"""
        # Clean up dead processes first
        self.network_pool = [p for p in self.network_pool if p.poll() is None]
        
        # Common safe endpoints
        endpoints = [
            "https://google.com",
            "https://github.com",
            "https://stackoverflow.com",
            "https://www.microsoft.com",
            "https://www.wikipedia.org"
        ]
        
        for i in range(count):
            try:
                endpoint = random.choice(endpoints)
                p = subprocess.Popen(
                    ["curl", "-s", "-m", "5", endpoint],
                    shell=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                self.network_pool.append(p)
            except:
                pass
    
    def simulate_cpu_stress(self, duration=3):
        """Brief CPU spike simulation"""
        def stress():
            end_time = time.time() + duration
            while time.time() < end_time:
                _ = sum(i*i for i in range(10000))
        
        thread = threading.Thread(target=stress, daemon=True)
        thread.start()
    
    def cycle_threat_levels(self):
        """Continuously cycle through different threat levels"""
        cycle = 0
        
        while self.running:
            cycle += 1
            
            # Rotate threat levels every 20 seconds
            if cycle % 4 == 0:
                self.threat_level = "HIGH"
                print(f"\n🔴 [HIGH THREAT] Cycle {cycle}")
                self.simulate_process_spike(100)  # Spawn 100 processes (Target > 350)
                self.simulate_network_activity(50)  # Heavy network activity (Target > 100)
                self.simulate_cpu_stress(2)
                
                # Create flag for threat_monitor.py to detect "fake" failed login
                with open("simulated_login.flag", "w") as f:
                    f.write("1")
                
            elif cycle % 4 == 1:
                self.threat_level = "MEDIUM"
                print(f"\n🟡 [MEDIUM THREAT] Cycle {cycle}")
                self.simulate_process_spike(50)
                self.simulate_network_activity(25)
                
            elif cycle % 4 == 2:
                import os
                if os.path.exists("simulated_login.flag"):
                    os.remove("simulated_login.flag")

                self.threat_level = "LOW"
                print(f"\n🟢 [LOW THREAT] Cycle {cycle}")
                self.simulate_process_spike(20)
                self.simulate_network_activity(10)
                
            else:
                self.threat_level = "COOLING DOWN"
                print(f"\n❄️  [COOLING DOWN] Cycle {cycle}")
                # Let some processes die naturally, minimal new activity
                self.simulate_process_spike(2)
            
            # Status update
            alive_procs = len([p for p in self.process_pool if p.poll() is None])
            alive_nets = len([p for p in self.network_pool if p.poll() is None])
            print(f"   Active Processes: {alive_procs} | Network: {alive_nets}")
            
            # Wait 5 seconds before next cycle
            for i in range(5):
                if not self.running:
                    break
                time.sleep(1)
    
    def run(self):
        print("🚀 Starting Real-Time Continuous Threat Simulation")
        print("=" * 60)
        print("This simulation will continuously generate threat patterns:")
        print("  🔴 HIGH:   50 processes + 20 network connections")
        print("  🟡 MEDIUM: 25 processes + 10 network connections") 
        print("  🟢 LOW:    10 processes + 5 network connections")
        print("  ❄️  COOL:   Minimal activity (cleanup phase)")
        print("=" * 60)
        print("\n⏰ Threat levels cycle every ~5 seconds")
        print("📊 Watch your dashboard for real-time changes!")
        print("\n⚠️  Press Ctrl+C to stop the simulation\n")
        
        try:
            self.cycle_threat_levels()
        except KeyboardInterrupt:
            self.running = False
            self.cleanup()

if __name__ == "__main__":
    simulator = ThreatSimulator()
    simulator.run()
