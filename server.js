const express = require('express');
const { Pool } = require('pg');
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

// Database connection pool (PostgreSQL)
console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 All env keys:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE')));

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL is not set!');
  console.error('❌ Please set DATABASE_URL environment variable');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
let dbConnected = false;
console.log('🔗 Attempting to connect to database...');
console.log('📍 Connection string (first 50 chars):', process.env.DATABASE_URL.substring(0, 50) + '...');

pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully!');
    dbConnected = true;
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed!');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
  });

// Initialize database tables
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create villages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS villages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        x_coordinate INTEGER NOT NULL,
        y_coordinate INTEGER NOT NULL,
        population INTEGER DEFAULT 500,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create resources table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        village_id INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
        wood INTEGER DEFAULT 500,
        clay INTEGER DEFAULT 500,
        iron INTEGER DEFAULT 500,
        crop INTEGER DEFAULT 500,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized!');
    client.release();
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
  }
}

// Initialize database on startup
setTimeout(() => {
  console.log('⏱️ Initializing database tables...');
  initializeDatabase();
}, 2000);

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
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    dbConnected: dbConnected,
    timestamp: new Date() 
  });
});

// ===== AUTHENTICATION ROUTES =====

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

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

    const client = await pool.connect();

    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'User already exists' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await client.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
        [username, email, hashedPassword]
      );

      const user = result.rows[0];

      // Create initial village
      const villageResult = await client.query(
        'INSERT INTO villages (user_id, name, x_coordinate, y_coordinate) VALUES ($1, $2, $3, $4) RETURNING id',
        [user.id, `${username}'s Village`, Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)]
      );

      const villageId = villageResult.rows[0].id;

      // Create resources for village
      await client.query(
        'INSERT INTO resources (village_id) VALUES ($1)',
        [villageId]
      );

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        success: true, 
        message: 'User registered successfully',
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed: ' + err.message 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        success: true, 
        message: 'Login successful',
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed: ' + err.message 
    });
  }
});

// ===== DASHBOARD ROUTES =====

app.get('/api/dashboard', verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      const villagesResult = await client.query(
        'SELECT * FROM villages WHERE user_id = $1',
        [req.user.id]
      );

      res.json({
        success: true,
        villages: villagesResult.rows,
        totalVillages: villagesResult.rows.length
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== VILLAGES ROUTES =====

app.get('/api/villages', verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM villages WHERE user_id = $1',
        [req.user.id]
      );

      res.json({
        success: true,
        villages: result.rows
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/villages/:villageId', verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM villages WHERE id = $1 AND user_id = $2',
        [req.params.villageId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Village not found' });
      }

      res.json({
        success: true,
        village: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== RESOURCES ROUTES =====

app.get('/api/resources/:villageId', verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      // Check if village belongs to user
      const villageCheck = await client.query(
        'SELECT id FROM villages WHERE id = $1 AND user_id = $2',
        [req.params.villageId, req.user.id]
      );

      if (villageCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const result = await client.query(
        'SELECT * FROM resources WHERE village_id = $1',
        [req.params.villageId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Resources not found' });
      }

      res.json({
        success: true,
        resources: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/resources/:villageId/update', verifyToken, async (req, res) => {
  try {
    const { wood, clay, iron, crop } = req.body;
    const client = await pool.connect();

    try {
      // Check if village belongs to user
      const villageCheck = await client.query(
        'SELECT id FROM villages WHERE id = $1 AND user_id = $2',
        [req.params.villageId, req.user.id]
      );

      if (villageCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const result = await client.query(
        'UPDATE resources SET wood = $1, clay = $2, iron = $3, crop = $4, updated_at = CURRENT_TIMESTAMP WHERE village_id = $5 RETURNING *',
        [wood || 0, clay || 0, iron || 0, crop || 0, req.params.villageId]
      );

      res.json({
        success: true,
        resources: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});
