import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from './src/db';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-inventory-key';

  app.use(cors());
  app.use(express.json());

  // Middleware to authenticate
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Middleware for Admin only
  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['admin', 'staff']).default('staff')
      });
      const data = schema.parse(req.body);
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Auto-approve and make admin for the very first user if the table is empty
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
      const isApproved = userCount.count === 0 ? 1 : 0;
      const role = userCount.count === 0 ? 'admin' : data.role;
      
      const stmt = db.prepare('INSERT INTO users (name, email, password, role, is_approved) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(data.name, data.email, hashedPassword, role, isApproved);
      
      res.json({ id: info.lastInsertRowid, ...data, role, is_approved: isApproved, password: undefined });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (!user.is_approved) {
        return res.status(403).json({ error: 'Your account is pending admin approval' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(400).json({ error: 'Login failed' });
    }
  });

  // --- Locations ---
  app.get('/api/locations', authenticate, (req, res) => {
    const locations = db.prepare('SELECT * FROM locations ORDER BY name ASC').all();
    res.json(locations);
  });

  app.post('/api/locations', authenticate, isAdmin, (req, res) => {
    const { name } = req.body;
    try {
      const info = db.prepare('INSERT INTO locations (name) VALUES (?)').run(name);
      res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
      res.status(400).json({ error: 'Location already exists' });
    }
  });

  app.put('/api/locations/:id', authenticate, isAdmin, (req, res) => {
    const { name } = req.body;
    try {
      db.prepare('UPDATE locations SET name = ? WHERE id = ?').run(name, req.params.id);
      res.json({ success: true, name });
    } catch (err) {
      res.status(400).json({ error: 'Failed to update location' });
    }
  });

  app.delete('/api/locations/:id', authenticate, isAdmin, (req, res) => {
    db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Users/Members Management ---
  app.get('/api/users', authenticate, isAdmin, (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, is_approved, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  });

  app.put('/api/users/:id/approve', authenticate, isAdmin, (req, res) => {
    try {
      db.prepare('UPDATE users SET is_approved = 1 WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: 'Failed to approve user' });
    }
  });

  app.put('/api/users/:id/role', authenticate, isAdmin, (req, res) => {
    const { role } = req.body;
    if (role !== 'admin' && role !== 'staff') {
      return res.status(400).json({ error: 'Invalid role' });
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/users/:id', authenticate, isAdmin, (req, res) => {
    // Prevent self-deletion
    if (Number(req.params.id) === (req as any).user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Products ---
  app.get('/api/products', authenticate, (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY name ASC').all();
    res.json(products);
  });

  app.post('/api/products', authenticate, isAdmin, (req, res) => {
    const { name, total_stock } = req.body;
    try {
      const info = db.prepare('INSERT INTO products (name, total_stock) VALUES (?, ?)').run(name, total_stock || 0);
      res.json({ id: info.lastInsertRowid, name, total_stock: total_stock || 0 });
    } catch (err) {
      res.status(400).json({ error: 'Product already exists' });
    }
  });

  app.put('/api/products/:id', authenticate, isAdmin, (req, res) => {
    const { name } = req.body;
    db.prepare('UPDATE products SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/products/:id', authenticate, isAdmin, (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Stock Movements ---
  app.post('/api/stock/move', authenticate, (req, res) => {
    const { product_id, location_id, quantity, type } = req.body; // type: 'in' or 'out'
    const userId = (req as any).user.id;

    const transaction = db.transaction(() => {
      const product = db.prepare('SELECT total_stock FROM products WHERE id = ?').get(product_id) as any;
      if (!product) throw new Error('Product not found');

      if (type === 'out' && product.total_stock < quantity) {
        throw new Error('Insufficient stock');
      }

      const newStock = type === 'out' ? product.total_stock - quantity : product.total_stock + quantity;
      db.prepare('UPDATE products SET total_stock = ? WHERE id = ?').run(newStock, product_id);
      
      db.prepare('INSERT INTO stock_movements (product_id, location_id, user_id, quantity, type) VALUES (?, ?, ?, ?, ?)')
        .run(product_id, location_id, userId, quantity, type);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/history', authenticate, (req, res) => {
    const { product_id, location_id, user_id, type, start_date, end_date } = req.query;
    
    let query = `
      SELECT sm.*, p.name as product_name, l.name as location_name, u.name as user_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN locations l ON sm.location_id = l.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (product_id) {
      query += ` AND sm.product_id = ?`;
      params.push(product_id);
    }
    if (location_id) {
      query += ` AND sm.location_id = ?`;
      params.push(location_id);
    }
    if (user_id) {
      query += ` AND sm.user_id = ?`;
      params.push(user_id);
    }
    if (type) {
      query += ` AND sm.type = ?`;
      params.push(type);
    }
    if (start_date) {
      query += ` AND sm.created_at >= ?`;
      params.push(`${start_date} 00:00:00`);
    }
    if (end_date) {
      query += ` AND sm.created_at <= ?`;
      params.push(`${end_date} 23:59:59`);
    }

    query += ` ORDER BY sm.created_at DESC`;

    const history = db.prepare(query).all(...params);
    res.json(history);
  });

  app.get('/api/dashboard', authenticate, (req, res) => {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
    const totalStock = db.prepare('SELECT SUM(total_stock) as sum FROM products').get() as any;
    const pendingApprovals = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_approved = 0').get() as any;
    
    const stockDistribution = db.prepare('SELECT name, total_stock FROM products ORDER BY total_stock DESC LIMIT 5').all();
    
    const recentActivities = db.prepare(`
      SELECT sm.*, p.name as product_name, l.name as location_name, u.name as user_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN locations l ON sm.location_id = l.id
      LEFT JOIN users u ON sm.user_id = u.id
      ORDER BY sm.created_at DESC LIMIT 10
    `).all();

    res.json({
      totalProducts: totalProducts.count,
      totalStock: totalStock.sum || 0,
      pendingApprovals: pendingApprovals.count,
      stockDistribution,
      recentActivities
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
