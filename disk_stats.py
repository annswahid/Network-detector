import shutil
import json
import sys
import os

def get_disk_usage():
    total_all = 0
    used_all = 0
    free_all = 0
    
    # Iterate through possible drive letters on Windows
    if sys.platform == "win32":
        import string
        drives = ['%s:' % d for d in string.ascii_uppercase if os.path.exists('%s:' % d)]
    else:
        drives = ["/"]

    for drive in drives:
        try:
            total, used, free = shutil.disk_usage(drive)
            total_all += total
            used_all += used
            free_all += free
        except:
            continue
            
    try:
        if total_all == 0:
            print(json.dumps({"error": "No drives found"}))
            return

        # Convert to GB with 2 decimal places
        data = {
            "total": round(total_all / (1024**3), 2),
            "used": round(used_all / (1024**3), 2),
            "free": round(free_all / (1024**3), 2),
            "percent": round((used_all / total_all) * 100, 1),
            "drives_found": len(drives)
        }
        
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    get_disk_usage()
