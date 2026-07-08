import ctypes
import os
import sys

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

if __name__ == "__main__":
    print("-" * 40)
    print(f"Current User: {os.getlogin()}")
    
    if is_admin():
        print("✅ STATUS: ADMINISTRATOR (Good to go!)")
    else:
        print("❌ STATUS: NOT ADMINISTRATOR")
        print("👉 You MUST right-click your terminal and select 'Run as Administrator'")
    print("-" * 40)
    
    # Keep window open if double-clicked
    if sys.stdout.isatty():
        input("Press Enter to close...")
