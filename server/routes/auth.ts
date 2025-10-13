import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register new user
router.post('/register', (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Failed to create user' });
      }

      const token = jwt.sign({ userId: this.lastID, isAdmin: false }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.status(201).json({
        message: 'User created successfully',
        userId: this.lastID,
        token,
        needsInitialSelection: true,
      });
    }
  );
});

// Login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user: any) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has made initial selection
    db.get(
      'SELECT COUNT(*) as count FROM portfolios WHERE user_id = ? AND is_active = 1',
      [user.id],
      (err, result: any) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const token = jwt.sign(
          { userId: user.id, isAdmin: user.is_admin },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          message: 'Login successful',
          userId: user.id,
          username: user.username,
          isAdmin: user.is_admin,
          token,
          needsInitialSelection: result.count < 10,
        });
      }
    );
  });
});

// Get current user info
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  db.get('SELECT id, username, email, is_admin FROM users WHERE id = ?', [req.userId], (err, user: any) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has made initial selection
    db.get(
      'SELECT COUNT(*) as count FROM portfolios WHERE user_id = ? AND is_active = 1',
      [user.id],
      (err, result: any) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({
          ...user,
          needsInitialSelection: result.count < 10,
        });
      }
    );
  });
});

export default router;
