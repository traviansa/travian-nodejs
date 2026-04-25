const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

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

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

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

// ===== AUTHENTICATION ROUTES =====

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }

    const conn = await pool.getConnection();

    // Check if user already exists
    const [existingUser] = await conn.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      conn.release();
      return res.status(400).json({ 
        success: false, 
        error: 'Email or username already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await conn.query(
      'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [username, email, hashedPassword]
    );

    conn.release();

    // Generate token
    const token = jwt.sign(
      { id: result.insertId, username, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      message: 'Account created successfully',
      token,
      user: {
        id: result.insertId,
        username,
        email
      }
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    const conn = await pool.getConnection();

    // Find user
    const [users] = await conn.query(
      'SELECT id, username, email, password FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      conn.release();
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      conn.release();
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    conn.release();

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [users] = await conn.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    conn.release();

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user: users[0] });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== PLAYER ROUTES =====

// Get all players
app.get('/api/players', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT id, username, email, created_at FROM users LIMIT 10');
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
    const [rows] = await conn.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    conn.release();
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('Error fetching player:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== VILLAGE ROUTES =====

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

// ===== STATISTICS ROUTES =====

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
        onlinePlayers: Math.floor(players[0].count * 0.6),
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ERROR HANDLING =====

// Error handling middleware
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
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/register`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});
