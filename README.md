<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Frontend-React%20+%20Vite-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20+%20Python-339933?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb" />
</p>

# 🛡️ Network Detector — Real-Time Security Dashboard

> A real-time OS-level security monitoring dashboard that tracks network activity, system processes, disk usage, file changes, and threat levels — all from a single beautiful web interface.

---

## 📖 What Is This?

**Network Detector** is a full-stack security monitoring tool that runs on your local machine and provides a live dashboard showing:

- ⚡ **CPU & Memory usage** (live, matches Task Manager)
- 🌐 **Network speed** (upload/download in KB/s)
- 📊 **Active connections & processes**
- 🔴 **Threat score** with real-time alerts
- 📁 **File system changes** (detects new, deleted, modified files)
- 💾 **Disk storage breakdown**
- 🔐 **Failed login detection** (Windows Event Log)
- 🧪 **Built-in threat simulator** for testing/demos

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│               React Dashboard (Vite)            │
│         http://localhost:5173                    │
│                                                 │
│  ┌───────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Health     │ │ Network  │ │ Threat        │  │
│  │ Score      │ │ Stats    │ │ Timeline      │  │
│  ├───────────┤ ├──────────┤ ├───────────────┤  │
│  │ Process   │ │ Disk     │ │ File Monitor  │  │
│  │ Table     │ │ Chart    │ │ & Alerts      │  │
│  └───────────┘ └──────────┘ └───────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ API Calls
                       ▼
┌──────────────────────────────────────────────────┐
│          Node.js Proxy Server (:3001)            │
│                                                  │
│  • Caches API responses (4s TTL)                 │
│  • Spawns Python monitors as child processes     │
│  • Saves threat history to MongoDB Atlas         │
│  • Merges local + remote backend stats           │
└───────┬─────────────┬────────────────────────────┘
        │             │
        ▼             ▼
┌──────────────┐ ┌─────────────────────────────────┐
│  MongoDB     │ │  Python Monitors                │
│  Atlas       │ │                                 │
│  (Cloud DB)  │ │  • system_stats.py   (CPU/RAM)  │
│              │ │  • network_monitor.py (Speed)   │
│              │ │  • process_monitor.py (Procs)   │
│              │ │  • threat_monitor.py  (Threats)  │
│              │ │  • disk_stats.py     (Storage)  │
│              │ │  • file_monitor.py   (Watchdog) │
└──────────────┘ └─────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

| Tool       | Version   | Purpose               |
|------------|-----------|----------------------|
| **Node.js** | ≥ 18      | Proxy server + frontend |
| **Python**  | ≥ 3.8     | System monitors       |
| **pip**     | latest    | Python packages       |

### 1. Clone the repo

```bash
git clone https://github.com/annswahid/Network-detector.git
cd Network-detector
```

### 2. Install dependencies

```bash
# Node dependencies (React + proxy server)
npm install

# Python dependencies
pip install psutil watchdog
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
MONGO_URI=your_mongodb_atlas_connection_string
PROXY_CACHE_TTL_MS=4000
```

### 4. Run the application

You need **two terminals**:

**Terminal 1 — Start the proxy server (backend):**
```bash
npm run server
```

**Terminal 2 — Start the React frontend:**
```bash
npm run dev
```

Open your browser at **http://localhost:5173** 🎉

---

## 📂 Project Structure

```
Network-detector/
│
├── src/                        # React Frontend
│   ├── components/
│   │   ├── Dashboard.jsx       # Main dashboard layout
│   │   ├── HealthScore.jsx     # Threat level gauge
│   │   ├── NetworkStats.jsx    # Upload/download speed
│   │   ├── ProcessTable.jsx    # Running processes list
│   │   ├── DiskChart.jsx       # Disk storage chart
│   │   ├── MetricsChart.jsx    # CPU/RAM live charts
│   │   ├── ThreatTimeline.jsx  # Threat history timeline
│   │   ├── AlertsList.jsx      # Real-time security alerts
│   │   ├── HeatMap.jsx         # Activity heat map
│   │   ├── RootkitRadar.jsx    # Rootkit detection radar
│   │   ├── SysCallMatrix.jsx   # System call monitor
│   │   ├── AttackPanel.jsx     # Attack simulation panel
│   │   └── LogViewer.jsx       # Log viewer
│   ├── hooks/
│   │   └── useSystemData.js    # Custom hook for API polling
│   └── styles/
│       └── dashboard.css       # Dashboard styles
│
├── proxy-server.js             # Node.js API proxy + orchestrator
├── network_monitor.py          # Network speed monitor (psutil)
├── system_stats.py             # CPU & RAM monitor
├── process_monitor.py          # Active process tracker
├── threat_monitor.py           # Threat scoring engine
├── disk_stats.py               # Disk usage stats
├── file_monitor.py             # File system watcher (watchdog)
├── simulate_threat.py          # Threat simulation tool
│
├── models/
│   └── Threat.js               # MongoDB threat schema
│
├── package.json                # Node dependencies
├── vite.config.js              # Vite configuration
└── .gitignore                  # Ignored files
```

---

## 🔌 API Endpoints

All endpoints are served by the proxy server on `http://localhost:3001`:

| Endpoint             | Method | Description                          |
|----------------------|--------|--------------------------------------|
| `/api/stats`         | GET    | CPU, memory, and merged system stats |
| `/api/network-flow`  | GET    | Network upload/download speed (KB/s) |
| `/api/processes`     | GET    | List of active system processes      |
| `/api/threat-history`| GET    | Threat score history + alerts        |
| `/api/local-disk`    | GET    | Disk partition usage breakdown       |
| `/api/file-events`   | GET    | Recent file system changes           |
| `/api/syscalls`      | GET    | System call data (from backend)      |

---

## 🧪 Threat Simulator

The project includes a built-in threat simulator for testing and demonstrations:

```bash
python simulate_threat.py
```

This will cycle through threat levels automatically:

| Level       | What It Does                                  |
|-------------|-----------------------------------------------|
| 🔴 **HIGH**    | Spawns 100 processes + 50 network connections  |
| 🟡 **MEDIUM**  | Spawns 50 processes + 25 network connections   |
| 🟢 **LOW**     | Spawns 20 processes + 10 network connections   |
| ❄️ **COOLDOWN** | Minimal activity, cleanup phase               |

Press `Ctrl+C` to stop the simulation. All spawned processes are cleaned up automatically.

---

## 🛡️ Security Features

| Feature                     | How It Works                                                   |
|-----------------------------|----------------------------------------------------------------|
| **Threat Scoring**          | Scores 0–100 based on process count, network load, and alerts  |
| **Failed Login Detection**  | Reads Windows Security Event Log (Event ID 4625)               |
| **File Integrity**          | Monitors critical files for unauthorized changes               |
| **User Account Monitoring** | Detects deleted user accounts against a saved baseline         |
| **File System Watcher**     | Real-time tracking of file create/delete/modify events         |
| **Process Monitoring**      | Lists all running processes with CPU and memory usage           |

---

## ⚙️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 19, Vite 7, Chart.js         |
| Backend    | Node.js (HTTP proxy server)         |
| Monitors   | Python 3 (psutil, watchdog)         |
| Database   | MongoDB Atlas (Mongoose ODM)        |
| Styling    | Custom CSS with dark theme          |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available for educational purposes.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/annswahid">Muhammad Anas</a>
</p>
