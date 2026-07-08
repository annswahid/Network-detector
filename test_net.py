import psutil
try:
    connections = psutil.net_connections(kind='inet')
    established = [c for c in connections if c.status == psutil.CONN_ESTABLISHED]
    print(f"Total Connections: {len(connections)}")
    print(f"Established: {len(established)}")
except Exception as e:
    print(f"Error: {e}")
