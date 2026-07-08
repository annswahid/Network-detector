import subprocess
import sys

def check_security_log():
    print("Trying to read the last failed login event (ID 4625)...")
    try:
        # PowerShell command to get the last Event 4625
        cmd = [
            "powershell", 
            "-Command", 
            "Get-EventLog -LogName Security -InstanceId 4625 -Newest 1 | Select-Object TimeGenerated, Message"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print("\n❌ FAILED TO READ LOGS")
            print("Error Message:")
            print(result.stderr)
            print("\n👉 CAUSE: likely not running as Administrator.")
        else:
            if not result.stdout.strip():
                print("\n⚠️  No failed login events found in the log.")
                print("Try running 'runas /user:Administrator cmd' and typing a wrong password first.")
            else:
                print("\n✅ SUCCESS! verify permission works.")
                print("Last Failed Login Event:")
                print(result.stdout)
                
    except Exception as e:
        print(f"Python Error: {e}")

if __name__ == "__main__":
    check_security_log()
