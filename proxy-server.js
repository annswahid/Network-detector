import http from 'http';
import { exec, spawn } from 'child_process';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Threat from './models/Threat.js';

// MongoDB Atlas Connection
const MONGO_URI = 'mongodb+srv://anns:123@cluster0.9z3o3hg.mongodb.net/security_dashboard?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = 3001;
const BACKEND_HOST = '172.30.67.105';
const BACKEND_PORT = 8080;
console.log('CONFIGURED BACKEND PORT:', BACKEND_PORT); // Debug log to confirm loading correct file

const CACHE_TTL_MS = Number(process.env.PROXY_CACHE_TTL_MS) || 4000;
const cache = new Map();
const inFlight = new Map();

const getCachedOrFetch = (key, fetchFn) => {
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(fetchFn)
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  // Safety: force-clear inFlight after 5s so a hung request never blocks future ones
  setTimeout(() => inFlight.delete(key), 5000);

  inFlight.set(key, promise);
  return promise;
};

// --- START BACKGROUND MONITORS ---
console.log('Starting background monitors...');

// Start File Monitor (Persistent)
const fileMonitor = spawn('python', ['file_monitor.py'], {
  detached: false,
  stdio: 'ignore'
});

fileMonitor.on('error', (err) => {
  console.error('Failed to start File Monitor:', err);
});

// Ensure we kill the python process when node exits
process.on('exit', () => {
  fileMonitor.kill();
});
process.on('SIGINT', () => {
  fileMonitor.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  fileMonitor.kill();
  process.exit();
});

console.log(`File Monitor PID: ${fileMonitor.pid}`);

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // --- Local System Stats Endpoint (Merged with Backend if available) ---
  if (req.url === '/api/stats') {
    const fetchBackendStats = () => getCachedOrFetch('backend-stats', () => new Promise((resolve, reject) => {
      const options = {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: '/api/stats',
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      };

      const backendReq = http.request(options, (backendRes) => {
        let body = '';
        backendRes.on('data', chunk => body += chunk);
        backendRes.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (parseErr) {
            reject(parseErr);
          }
        });
      });

      backendReq.setTimeout(2000, () => {
        backendReq.destroy(new Error('Backend request timed out'));
      });
      backendReq.on('error', reject);
      backendReq.end();
    }));

    const fetchLocalStats = () => getCachedOrFetch('local-stats', () => new Promise((resolve) => {
      exec('python system_stats.py', (error, stdout) => {
        if (error) {
          resolve({ error: error.message });
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseErr) {
          resolve({ error: 'Failed to parse local stats: ' + parseErr.message });
        }
      });
    }));

    Promise.allSettled([fetchBackendStats(), fetchLocalStats()]).then((results) => {
      const backendResult = results[0];
      const localResult = results[1];

      const backendData = backendResult.status === 'fulfilled' ? backendResult.value : null;
      const localData = localResult.status === 'fulfilled' ? localResult.value : null;

      if (!backendData && !localData) {
        res.writeHead(503);
        res.end(JSON.stringify({ error: 'Failed to fetch stats from backend and local' }));
        return;
      }

      if (!backendData || backendData.error) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(localData || {}));
        return;
      }

      if (!localData || localData.error) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(backendData));
        return;
      }

      const merged = {
        ...backendData,
        ...localData,
        source: 'merged'
      };

      // Prefer local CPU to match Task Manager (backend CPU may be a different host).
      if (localData && typeof localData.cpu_usage === 'number') {
        merged.cpu_usage = localData.cpu_usage;
        merged.cpu_source = 'local';
      }

      if (backendData.disk || localData.disk) {
        merged.disk = { ...(backendData.disk || {}), ...(localData.disk || {}) };
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(merged));
    }).catch((err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // --- Local Disk Storage Endpoint (Python) ---
  if (req.url === '/api/local-disk') {
    getCachedOrFetch('local-disk', () => new Promise((resolve, reject) => {
      exec('python disk_stats.py', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    })).then((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    }).catch((err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // --- Local Threat History Endpoint (Python + MongoDB) ---
  if (req.url === '/api/threat-history') {
    getCachedOrFetch('threat-history', () => new Promise((resolve, reject) => {
      exec('python threat_monitor.py', async (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const pythonData = JSON.parse(stdout);

          // Get last saved blockedCount from DB and accumulate
          const lastThreat = await Threat.findOne().sort({ timestamp: -1 });
          const prevBlocked = lastThreat?.blockedCount || 0;
          const newBlocked = prevBlocked + (pythonData.blocked_count || 0);

          // Save current scan to MongoDB
          const newThreat = new Threat({
            level: pythonData.current_score,
            stats: pythonData._raw_stats,
            status: pythonData.status,
            blockedCount: newBlocked
          });
          await newThreat.save();

          // Fetch last 12 minutes
          const cutoff = new Date(Date.now() - 12 * 60 * 1000);
          const historyData = await Threat.find({ timestamp: { $gte: cutoff } })
            .sort({ timestamp: 1 });

          const responseData = {
            history: historyData.map(t => ({ level: t.level })),
            status: pythonData.status,
            current_score: pythonData.current_score,
            alerts: pythonData.alerts || [],
            breakdown: pythonData.breakdown || [],
            blocked_count: newBlocked,
            _raw_stats: pythonData._raw_stats || { proc_count: 0, net_count: 0 }
          };

          resolve(responseData);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    })).then((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }).catch((err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to process threat data: ' + err.message }));
    });
    return;
  }

  // --- Local Network Flow Endpoint (Python) ---
  if (req.url === '/api/network-flow') {
    getCachedOrFetch('network-flow', () => new Promise((resolve, reject) => {
      exec('python network_monitor.py', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    })).then((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    }).catch((err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // --- Local Process Monitor Endpoint (Python) ---
  if (req.url === '/api/processes') {
    getCachedOrFetch('processes', () => new Promise((resolve, reject) => {
      exec('python process_monitor.py', { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    })).then((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    }).catch((err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // --- File Events Endpoint (Reads JSON file from background worker) ---
  if (req.url === '/api/file-events') {
    const filePath = path.join(process.cwd(), 'file_events.json');

    if (!fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ events: [], status: 'initializing' }));
      return;
    }

    getCachedOrFetch('file-events', () => new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    })).then((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    }).catch((err) => {
      console.error('Error reading file events:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to read file events' }));
    });
    return;
  }

  // --- Syscalls Endpoint (proxied from backend) ---
  if (req.url === '/api/syscalls') {
    getCachedOrFetch('syscalls', () => new Promise((resolve, reject) => {
      const options = {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: '/api/syscalls',
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      };

      const backendReq = http.request(options, (backendRes) => {
        let body = '';
        backendRes.on('data', chunk => body += chunk);
        backendRes.on('end', () => {
          resolve(body);
        });
      });

      backendReq.setTimeout(2000, () => {
        backendReq.destroy(new Error('Backend request timed out'));
      });

      backendReq.on('error', (err) => {
        reject(err);
      });

      backendReq.end();
    })).then((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    }).catch((err) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable: ' + err.message }));
    });
    return;
  }

  console.log(`Proxying ${req.method} ${req.url} to http://${BACKEND_HOST}:${BACKEND_PORT}${req.url}`);

  // Proxy the request to backend
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable (Is it running?): ' + err.message }));
    }
  });

  req.pipe(proxyReq);
});

// Prevent server crash on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR (Uncaught):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Forwarding requests to http://${BACKEND_HOST}:${BACKEND_PORT}`);
});
