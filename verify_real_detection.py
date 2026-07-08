import subprocess
import os
import sys
import ctypes

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def check_event_log():
    if not is_admin():
        print("❌ STATUS: NOT ADMINISTRATOR")
        print("   -> Windows Security Log requires Administrator privileges.")
        print("   -> Right-click your terminal and select 'Run as Administrator'.")
        return

    print("✅ STATUS: ADMINISTRATOR")
    print("   -> Checking Security Log for failed logins (Event 4625)...")
    
    ps_cmd = """
    (Get-WinEvent -FilterHashtable @{
        LogName='Security';
        Id=4625;
        StartTime=(Get-Date).AddSeconds(-600)
    } -ErrorAction SilentlyContinue).Count
    """
    
    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_cmd],
            capture_output=True, text=True
        )
        
        count = result.stdout.strip()
        if count and count.isdigit():
            print(f"✅ SUCCESS: Found {count} failed login attempts in the last 10 minutes.")
        else:
            print("⚠️ RESULT: 0 events found (or command failed silently).")
            print("   -> Try running 'runas /user:Administrator cmd' and typing a wrong password to generate an event.")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    check_event_log()
    input("\nPress Enter to close...")
