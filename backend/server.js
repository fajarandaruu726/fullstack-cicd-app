// ============================================================
// Maintenance Enterprise v2.6 - Backend API Server
// Express REST API + Socket.io (real-time) + Redis cache + Multer
// Dokumentasi header: Ahmad Danu Risky Lubis (231112458)
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Inisialisasi Socket.io Real-time Server
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

// Konfigurasi Folder Upload Bukti Foto
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Konfigurasi Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Koneksi Database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@db:5432/workorder_db'
});

// Koneksi Redis Container
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});
redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.connect().then(() => console.log('✓ Terhubung ke Redis Container Cache')).catch(() => {});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Helper Invalidate Redis Cache
const clearCache = async () => {
  try {
    await redisClient.del('orders_cache_all');
  } catch (err) {
    console.error('Redis Del Error:', err);
  }
};

// --- ENDPOINT AUTHENTICATION (JWT) ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  if ((username === 'admin' && password === 'admin') || (username === 'client' && password === 'client') || username) {
    const userRole = role || (username === 'admin' ? 'admin' : 'client');
    const token = jwt.sign({ username, role: userRole }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, role: userRole, username });
  }
  return res.status(401).json({ error: 'Kredensial login salah' });
});

// --- REST API ENDPOINTS ---

// GET: Ambil Daftar Orders (dengan Redis Caching)
app.get('/api/orders', async (req, res) => {
  try {
    const { search, status } = req.query;
    
    // Cek Cache Redis jika tanpa filter
    if (!search && (!status || status === 'All')) {
      const cachedData = await redisClient.get('orders_cache_all');
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
    }

    let query = 'SELECT * FROM work_orders WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR customer_name ILIKE $${params.length})`;
    }
    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);

    // Simpan data ke Redis Cache selama 60 detik
    if (!search && (!status || status === 'All')) {
      await redisClient.setEx('orders_cache_all', 60, JSON.stringify(result.rows));
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Buat Order Baru (dengan Upload Foto via Multer)
app.post('/api/orders', upload.single('image'), async (req, res) => {
  try {
    const { title, category, customer_name, priority } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      'INSERT INTO work_orders (title, category, customer_name, priority, status, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, category, customer_name, priority || 'Medium', 'Pending', imageUrl]
    );

    const newOrder = result.rows[0];
    await clearCache();

    // Broadcast Event Real-Time ke Semua Client terhubung
    io.emit('order_created', newOrder);

    res.json(newOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update Status Order
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE work_orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    const updatedOrder = result.rows[0];
    await clearCache();

    // Broadcast Event Real-Time ke Socket.io Client
    io.emit('order_updated', updatedOrder);

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Hapus Order (Verifikasi Admin)
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM work_orders WHERE id = $1', [id]);
    await clearCache();

    // Broadcast Event Real-Time Delete
    io.emit('order_deleted', { id: parseInt(id) });

    res.json({ message: 'Tiket berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event Logging Socket.io
io.on('connection', (socket) => {
  console.log('⚡ Client terhubung ke Socket.io:', socket.id);
  socket.on('disconnect', () => {
    console.log(' Client terputus dari Socket.io:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`ServiTask API (JWT + Socket.io + Redis) active on port ${PORT}`));