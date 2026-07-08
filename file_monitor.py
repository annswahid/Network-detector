#!/usr/bin/env python3
"""
File System Monitor (Background Service)
Watches key directories and writes recent events to `file_events.json` in real-time.
"""

import json
import sys
import os
import time
import threading
from pathlib import Path
from collections import deque

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    print("Error: watchdog module not found")
    sys.exit(1)

OUTPUT_FILE = "file_events.json"
MAX_EVENTS = 50

class FileEventCollector(FileSystemEventHandler):
    """Collects filesystem events and updates the JSON file."""
    
    def __init__(self):
        self.events = deque(maxlen=MAX_EVENTS)
        self.lock = threading.Lock()
        self.ignore_patterns = [
            '.git', 'node_modules', '__pycache__', '.venv',
            '.tmp', '.swp', '.swo', '~', '.DS_Store',
            'package-lock.json', '.pyc', 'file_events.json'
        ]
        self._load_existing()

    def _load_existing(self):
        """Load existing events if valid."""
        if os.path.exists(OUTPUT_FILE):
            try:
                with open(OUTPUT_FILE, 'r') as f:
                    data = json.load(f)
                    for e in data.get('events', []):
                        self.events.append(e)
            except:
                pass

    def _should_ignore(self, path):
        for pattern in self.ignore_patterns:
            if pattern in path:
                return True
        return False
    
    def _save_events(self):
        """Write current events to JSON file."""
        with self.lock:
            try:
                data = {
                    "events": list(self.events),
                    "last_updated": int(time.time() * 1000)
                }
                # Write to temp file then rename to avoid read conflicts
                temp_file = OUTPUT_FILE + ".tmp"
                with open(temp_file, 'w') as f:
                    json.dump(data, f)
                os.replace(temp_file, OUTPUT_FILE)
            except Exception as e:
                print(f"Error saving events: {e}")

    def _add_event(self, event_type, path, is_directory=False):
        if self._should_ignore(path):
            return
        
        try:
            home = str(Path.home())
            display_path = path.replace(home, '~')
        except:
            display_path = path
        
        event = {
            "type": event_type,
            "path": display_path,
            "is_directory": is_directory,
            "timestamp": int(time.time() * 1000),
            "time": time.strftime("%H:%M:%S")
        }
        
        self.events.append(event)
        self._save_events()
        print(f"[FILE EVENT] {event_type}: {display_path}")

    def on_created(self, event):
        self._add_event("created", event.src_path, event.is_directory)
    
    def on_deleted(self, event):
        self._add_event("deleted", event.src_path, event.is_directory)
    
    def on_modified(self, event):
        if not event.is_directory:
            self._add_event("modified", event.src_path, False)
    
    def on_moved(self, event):
        self._add_event("moved", event.src_path, event.is_directory)

def get_watch_directories():
    home = Path.home()
    dirs = []
    candidates = [home / "Desktop", home / "Downloads", home / "Documents"]
    for d in candidates:
        if d.exists():
            dirs.append(str(d))
    return dirs if dirs else [str(home)]

def main():
    handler = FileEventCollector()
    observer = Observer()
    watch_dirs = get_watch_directories()
    
    print(f"DEBUG: Starting File Monitor on: {watch_dirs}")
    print("DEBUG: Waiting for file system events...")
    
    for directory in watch_dirs:
        try:
            observer.schedule(handler, directory, recursive=False)
            print(f"DEBUG: Scheduled watch on {directory}")
        except Exception as e:
            print(f"DEBUG: Failed to watch {directory}: {e}")
            
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    
    observer.join()

if __name__ == "__main__":
    main()
