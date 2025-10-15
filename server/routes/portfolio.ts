import express, { Request, Response } from 'express';
import db from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get current user's portfolio
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = `
    SELECT 
      p.id,
      p.allocation,
      p.month_added,
      p.year_added,
      s.id as stock_id,
      s.symbol,
      s.name,
      s.sector,
      s.current_price
    FROM portfolios p
    JOIN stocks s ON p.stock_id = s.id
    WHERE p.user_id = ? AND p.is_active = 1
    ORDER BY s.symbol
  `;

  db.all(query, [req.userId], (err, portfolio) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
    res.json(portfolio);
  });
});

// Initial stock selection (exactly 10 stocks, each with £5 allocation)
router.post('/initial-selection', authenticateToken, (req: AuthRequest, res: Response) => {
  const { stock_ids } = req.body;

  if (!Array.isArray(stock_ids) || stock_ids.length !== 10) {
    return res.status(400).json({ error: 'Must select exactly 10 stocks' });
  }

  // Check if user already has a portfolio
  db.get(
    'SELECT COUNT(*) as count FROM portfolios WHERE user_id = ? AND is_active = 1',
    [req.userId],
    (err, result: any) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.count > 0) {
        return res.status(400).json({ error: 'Portfolio already exists' });
      }

      // Verify all stocks exist
      const placeholders = stock_ids.map(() => '?').join(',');
      db.all(
        `SELECT id FROM stocks WHERE id IN (${placeholders})`,
        stock_ids,
        (err, stocks: any[]) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (stocks.length !== 10) {
            return res.status(400).json({ error: 'One or more invalid stock IDs' });
          }

          // Insert portfolio entries (£5 each, total £50)
          const currentDate = new Date();
          const month = currentDate.getMonth() + 1;
          const year = currentDate.getFullYear();
          const allocation = 5; // £5 per stock

          const stmt = db.prepare(
            'INSERT INTO portfolios (user_id, stock_id, allocation, month_added, year_added, is_active) VALUES (?, ?, ?, ?, ?, 1)'
          );

          let completed = 0;
          let error = false;

          stock_ids.forEach((stockId) => {
            stmt.run([req.userId, stockId, allocation, month, year], (err) => {
              if (err && !error) {
                error = true;
                stmt.finalize();
                return res.status(500).json({ error: 'Failed to create portfolio' });
              }

              completed++;
              if (completed === stock_ids.length && !error) {
                stmt.finalize();
                res.json({ message: 'Portfolio created successfully' });
              }
            });
          });
        }
      );
    }
  );
});

// Get pending switches for current user
router.get('/pending-switches', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = `
    SELECT 
      ps.id,
      ps.effective_month,
      ps.effective_year,
      ps.requested_at,
      old_stock.symbol as old_stock_symbol,
      old_stock.name as old_stock_name,
      new_stock.symbol as new_stock_symbol,
      new_stock.name as new_stock_name
    FROM pending_switches ps
    JOIN stocks old_stock ON ps.old_stock_id = old_stock.id
    JOIN stocks new_stock ON ps.new_stock_id = new_stock.id
    WHERE ps.user_id = ?
    ORDER BY ps.effective_year DESC, ps.effective_month DESC
  `;

  db.all(query, [req.userId], (err, switches) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch pending switches' });
    }
    res.json(switches);
  });
});

// Request a stock switch (takes effect next month)
router.post('/switch', authenticateToken, (req: AuthRequest, res: Response) => {
  const { old_stock_id, new_stock_id } = req.body;

  if (!old_stock_id || !new_stock_id) {
    return res.status(400).json({ error: 'Both old and new stock IDs are required' });
  }

  if (old_stock_id === new_stock_id) {
    return res.status(400).json({ error: 'Cannot switch a stock with itself' });
  }

  // Check if old stock is in user's portfolio
  db.get(
    'SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ? AND is_active = 1',
    [req.userId, old_stock_id],
    (err, portfolio: any) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!portfolio) {
        return res.status(400).json({ error: 'Stock not found in your portfolio' });
      }

      // Check if new stock exists
      db.get('SELECT * FROM stocks WHERE id = ?', [new_stock_id], (err, stock: any) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!stock) {
          return res.status(400).json({ error: 'New stock not found' });
        }

        // Check if new stock is already in portfolio
        db.get(
          'SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ? AND is_active = 1',
          [req.userId, new_stock_id],
          (err, existingPortfolio: any) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            if (existingPortfolio) {
              return res.status(400).json({ error: 'Stock already in your portfolio' });
            }

            // Calculate next month
            const currentDate = new Date();
            let effectiveMonth = currentDate.getMonth() + 2; // Next month (0-indexed + 1 + 1)
            let effectiveYear = currentDate.getFullYear();

            if (effectiveMonth > 12) {
              effectiveMonth = 1;
              effectiveYear += 1;
            }

            // Check for existing pending switch for this stock
            db.get(
              'SELECT * FROM pending_switches WHERE user_id = ? AND old_stock_id = ?',
              [req.userId, old_stock_id],
              (err, existingSwitch: any) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }

                if (existingSwitch) {
                  // Update existing switch
                  db.run(
                    'UPDATE pending_switches SET new_stock_id = ?, effective_month = ?, effective_year = ?, requested_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [new_stock_id, effectiveMonth, effectiveYear, existingSwitch.id],
                    (err) => {
                      if (err) {
                        return res.status(500).json({ error: 'Failed to update switch request' });
                      }
                      res.json({ message: 'Switch request updated successfully' });
                    }
                  );
                } else {
                  // Create new switch request
                  db.run(
                    'INSERT INTO pending_switches (user_id, old_stock_id, new_stock_id, effective_month, effective_year) VALUES (?, ?, ?, ?, ?)',
                    [req.userId, old_stock_id, new_stock_id, effectiveMonth, effectiveYear],
                    function (err) {
                      if (err) {
                        return res.status(500).json({ error: 'Failed to create switch request' });
                      }
                      res.json({ message: 'Switch request created successfully' });
                    }
                  );
                }
              }
            );
          }
        );
      });
    }
  );
});

// Cancel a pending switch
router.delete('/switch/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  db.run(
    'DELETE FROM pending_switches WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to cancel switch' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Switch request not found' });
      }
      res.json({ message: 'Switch request cancelled successfully' });
    }
  );
});

// Get portfolio performance
router.get('/performance', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = `
    SELECT 
      p.allocation,
      s.symbol,
      s.name,
      mp.price as closing_price,
      mp.month,
      mp.year,
      (p.allocation / s.current_price * mp.price) as current_value
    FROM portfolios p
    JOIN stocks s ON p.stock_id = s.id
    LEFT JOIN monthly_prices mp ON s.id = mp.stock_id
    WHERE p.user_id = ? AND p.is_active = 1
    ORDER BY mp.year DESC, mp.month DESC
  `;

  db.all(query, [req.userId], (err, performance) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch performance' });
    }
    res.json(performance);
  });
});

export default router;
