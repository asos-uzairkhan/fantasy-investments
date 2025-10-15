import db from '../models/database';
import bcrypt from 'bcryptjs';

// Seed admin user and sample stocks
const seedData = () => {
  console.log('Starting database seeding...');

  // Create admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(
    'INSERT OR IGNORE INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
    ['admin', 'admin@fantasystocks.com', adminPassword, 1],
    (err) => {
      if (err) {
        console.error('Error creating admin user:', err);
      } else {
        console.log('✓ Admin user created (email: admin@fantasystocks.com, password: admin123)');
      }
    }
  );

  // Sample stocks data
  const stocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 175.50 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', price: 380.25 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', price: 142.80 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'E-commerce', price: 155.60 },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', price: 245.30 },
    { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Social Media', price: 325.90 },
    { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment', price: 450.75 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', price: 495.20 },
    { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Entertainment', price: 95.40 },
    { symbol: 'BA', name: 'Boeing Company', sector: 'Aerospace', price: 215.80 },
    { symbol: 'NKE', name: 'Nike Inc.', sector: 'Apparel', price: 108.50 },
    { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Food & Beverage', price: 98.25 },
    { symbol: 'MCD', name: 'McDonald\'s Corporation', sector: 'Food & Beverage', price: 285.60 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Banking', price: 165.75 },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services', price: 245.90 },
  ];

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO stocks (symbol, name, sector, current_price) VALUES (?, ?, ?, ?)'
  );

  let completed = 0;
  stocks.forEach((stock) => {
    stmt.run([stock.symbol, stock.name, stock.sector, stock.price], (err) => {
      if (err) {
        console.error(`Error adding ${stock.symbol}:`, err);
      } else {
        console.log(`✓ Added ${stock.symbol} - ${stock.name}`);
      }
      completed++;
      if (completed === stocks.length) {
        stmt.finalize();
        console.log('\n✓ Database seeding completed!');
        console.log('\nYou can now:');
        console.log('1. Login as admin: admin@fantasystocks.com / admin123');
        console.log('2. Register as a new player and select your stocks');
        db.close();
        process.exit(0);
      }
    });
  });
};

// Initialize database first, then seed
setTimeout(() => {
  seedData();
}, 1000);
