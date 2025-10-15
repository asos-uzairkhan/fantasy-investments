import express, { Request, Response } from 'express';
import db from '../models/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all stocks (public)
router.get('/', (req: Request, res: Response) => {
  db.all('SELECT * FROM stocks ORDER BY symbol', [], (err, stocks) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch stocks' });
    }
    res.json(stocks);
  });
});

// Get a single stock
router.get('/:id', (req: Request, res: Response) => {
  db.get('SELECT * FROM stocks WHERE id = ?', [req.params.id], (err, stock) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch stock' });
    }
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(stock);
  });
});

// Add new stock (admin only)
router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { symbol, name, sector, current_price } = req.body;

  if (!symbol || !name) {
    return res.status(400).json({ error: 'Symbol and name are required' });
  }

  db.run(
    'INSERT INTO stocks (symbol, name, sector, current_price) VALUES (?, ?, ?, ?)',
    [symbol.toUpperCase(), name, sector || null, current_price || null],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Stock symbol already exists' });
        }
        return res.status(500).json({ error: 'Failed to add stock' });
      }

      res.status(201).json({
        message: 'Stock added successfully',
        stockId: this.lastID,
      });
    }
  );
});

// Update stock (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { symbol, name, sector, current_price } = req.body;

  db.run(
    'UPDATE stocks SET symbol = ?, name = ?, sector = ?, current_price = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
    [symbol?.toUpperCase(), name, sector, current_price, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update stock' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Stock not found' });
      }
      res.json({ message: 'Stock updated successfully' });
    }
  );
});

// Delete stock (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  db.run('DELETE FROM stocks WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete stock' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json({ message: 'Stock deleted successfully' });
  });
});

// Record monthly closing price (admin only)
router.post('/:id/monthly-price', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { price, month, year } = req.body;

  if (!price || !month || !year) {
    return res.status(400).json({ error: 'Price, month, and year are required' });
  }

  db.run(
    'INSERT OR REPLACE INTO monthly_prices (stock_id, price, month, year) VALUES (?, ?, ?, ?)',
    [req.params.id, price, month, year],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to record monthly price' });
      }
      res.json({ message: 'Monthly price recorded successfully' });
    }
  );
});

// Get monthly prices for a stock
router.get('/:id/monthly-prices', (req: Request, res: Response) => {
  db.all(
    'SELECT * FROM monthly_prices WHERE stock_id = ? ORDER BY year DESC, month DESC',
    [req.params.id],
    (err, prices) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch monthly prices' });
      }
      res.json(prices);
    }
  );
});

export default router;
