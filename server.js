const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'travian',
  password: process.env.DB_PASSWORD || 'travian123',
  database: process.env.DB_NAME || 'travian',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

// Test database connection
let dbConnected = false;
pool.getConnection()
  .then(conn => {
    console.log('✅ Database connected successfully!');
    dbConnected = true;
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection details:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
  });

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'ترافيان الأول - Travian First',
    status: 'Server is running!',
    dbConnected: dbConnected,
    timestamp: new Date()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    dbConnected: dbConnected,
    timestamp: new Date() 
  });
});

// Get all players
app.get('/api/players', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM users LIMIT 10');
    conn.release();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get player by ID
app.get('/api/players/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('Error fetching player:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create player
app.post('/api/players', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email required' });
    }
    
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password || 'default']
    );
    conn.release();
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error creating player:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get villages
app.get('/api/villages', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM villages LIMIT 20');
    conn.release();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Error fetching villages:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get resources
app.get('/api/resources/:villageId', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT * FROM resources WHERE village_id = ?',
      [req.params.villageId]
    );
    conn.release();
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get game statistics
app.get('/api/stats', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [players] = await conn.query('SELECT COUNT(*) as count FROM users');
    const [villages] = await conn.query('SELECT COUNT(*) as count FROM villages');
    conn.release();
    
    res.json({ 
      success: true, 
      stats: {
        totalPlayers: players[0].count,
        totalVillages: villages[0].count,
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Access: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});
