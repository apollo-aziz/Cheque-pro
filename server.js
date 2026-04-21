
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { transform } = require('sucrase');

// Try loading environment variables from both .env.local and .env
// .env.local is optional (development override)
try { require('dotenv').config({ path: '.env.local' }); } catch (e) { /* ignore */ }
require('dotenv').config();

// Fallback: Map GEMINI_API_KEY to API_KEY if API_KEY is missing
if (!process.env.API_KEY && process.env.GEMINI_API_KEY) {
  process.env.API_KEY = process.env.GEMINI_API_KEY;
}

const app = express();
const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'finansse-pro-secret-key-change-me';

// Database
const { testConnection } = require('./database/db');
const db = require('./database/api');

// Simple In-memory cache for transpiled files to boost performance
const transpileCache = new Map();

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));

// 1. CORS & Security Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ========== AUTH API ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await db.createUser({ email, password_hash, full_name, role: 'user' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, email: user.email, full_name: user.full_name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ========== CHECKS API ==========
app.get('/api/checks', authMiddleware, async (req, res) => {
  try {
    const checks = await db.getAllChecks();
    res.json(checks);
  } catch (err) {
    console.error('Get checks error:', err);
    res.status(500).json({ error: 'Failed to get checks' });
  }
});

app.post('/api/checks', authMiddleware, async (req, res) => {
  try {
    const check = await db.createCheck({ ...req.body, created_by: req.user.id });
    res.json(check);
  } catch (err) {
    console.error('Create check error:', err);
    res.status(500).json({ error: 'Failed to create check' });
  }
});

app.put('/api/checks/:id', authMiddleware, async (req, res) => {
  try {
    const check = await db.updateCheck(req.params.id, req.body);
    res.json(check);
  } catch (err) {
    console.error('Update check error:', err);
    res.status(500).json({ error: 'Failed to update check' });
  }
});

app.delete('/api/checks/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteCheck(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete check error:', err);
    res.status(500).json({ error: 'Failed to delete check' });
  }
});

// ========== SETTINGS API ==========
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await db.getSettings(req.user.id);
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await db.updateSettings(req.user.id, req.body);
    res.json(settings);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ========== STATS API ==========
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await db.getCheckStatistics();
    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// 2. Optimized Transpilation with Caching
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (ext === '.ts' || ext === '.tsx') {
    const filePath = path.join(__dirname, req.path);

    // Check cache first
    if (transpileCache.has(filePath)) {
      res.set('Content-Type', 'application/javascript');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(transpileCache.get(filePath));
    }

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = transform(content, {
          transforms: ['typescript', 'jsx'],
          production: true,
          jsxPragma: 'React.createElement',
          jsxFragmentPragma: 'React.Fragment'
        });

        let code = result.code;

        // Inject essential environment variables into the client-side code.
        const envKeys = ['API_KEY'];
        envKeys.forEach(key => {
          const val = process.env[key] || '';
          const regex = new RegExp(`process\\.env\\.${key}`, 'g');
          code = code.replace(regex, JSON.stringify(val));
        });

        // Save to cache
        transpileCache.set(filePath, code);

        res.set('Content-Type', 'application/javascript');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(code);
      } catch (err) {
        console.error(`Transpilation error for ${req.path}:`, err);
        res.set('Content-Type', 'application/javascript');
        return res.status(500).send(`/* Transpilation Error: ${err.message} */`);
      }
    } else {
      console.warn(`File not found: ${filePath}`);
      return res.status(404).set('Content-Type', 'text/plain').send('File not found');
    }
  }
  next();
});

// 3. Static Files
app.use(express.static(__dirname));

// 4. SPA Routing
app.get('*', (req, res) => {
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('Resource not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', async () => {
  console.log(`=====================================`);
  console.log(`FINANSSE PRO Server Started`);
  console.log(`Listening on port: ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MySQL configured: ${process.env.DB_HOST ? 'Yes' : 'No'}`);

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Warning: MySQL database not connected');
  }
  console.log(`=====================================`);
});
