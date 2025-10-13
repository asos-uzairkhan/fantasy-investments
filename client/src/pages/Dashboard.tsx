import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getPortfolio,
  getStocks,
  getPendingSwitches,
  requestSwitch,
  cancelSwitch,
} from '../services/api';
import './Dashboard.css';

interface PortfolioItem {
  id: number;
  stock_id: number;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  allocation: number;
}

interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
}

interface PendingSwitch {
  id: number;
  old_stock_symbol: string;
  old_stock_name: string;
  new_stock_symbol: string;
  new_stock_name: string;
  effective_month: number;
  effective_year: number;
}

interface DashboardProps {
  onLogout: () => void;
  isAdmin: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, isAdmin }) => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [pendingSwitches, setPendingSwitches] = useState<PendingSwitch[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [selectedOldStock, setSelectedOldStock] = useState<number | null>(null);
  const [selectedNewStock, setSelectedNewStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [portfolioRes, stocksRes, switchesRes] = await Promise.all([
        getPortfolio(),
        getStocks(),
        getPendingSwitches(),
      ]);
      setPortfolio(portfolioRes.data);
      setAllStocks(stocksRes.data);
      setPendingSwitches(switchesRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSwitch = async () => {
    if (!selectedOldStock || !selectedNewStock) {
      setError('Please select both stocks');
      return;
    }

    try {
      await requestSwitch(selectedOldStock, selectedNewStock);
      setSuccess('Switch request submitted successfully!');
      setShowSwitchModal(false);
      setSelectedOldStock(null);
      setSelectedNewStock(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request switch');
    }
  };

  const handleCancelSwitch = async (switchId: number) => {
    try {
      await cancelSwitch(switchId);
      setSuccess('Switch request cancelled');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel switch');
    }
  };

  const totalValue = portfolio.reduce((sum, item) => {
    if (item.current_price) {
      return sum + (item.allocation / item.current_price) * item.current_price;
    }
    return sum + item.allocation;
  }, 0);

  const availableStocksForSwitch = allStocks.filter(
    stock => !portfolio.some(p => p.stock_id === stock.id)
  );

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Fantasy Investments Dashboard</h1>
        <div className="header-actions">
          {isAdmin && (
            <Link to="/admin" className="admin-link">
              Admin Panel
            </Link>
          )}
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="dashboard-content">
        <section className="portfolio-section">
          <div className="section-header">
            <h2>Your Portfolio</h2>
            <div className="portfolio-value">
              Total Value: £{totalValue.toFixed(2)}
            </div>
          </div>
          <div className="portfolio-grid">
            {portfolio.map(item => (
              <div key={item.id} className="portfolio-card">
                <h3>{item.symbol}</h3>
                <p className="stock-name">{item.name}</p>
                <p className="stock-sector">{item.sector}</p>
                <div className="stock-details">
                  <span>Investment: £{item.allocation.toFixed(2)}</span>
                  {item.current_price && (
                    <span>Current Price: £{item.current_price.toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            className="switch-button"
            onClick={() => setShowSwitchModal(true)}
          >
            Request Stock Switch
          </button>
        </section>

        {pendingSwitches.length > 0 && (
          <section className="pending-switches-section">
            <h2>Pending Switches</h2>
            <div className="switches-list">
              {pendingSwitches.map(sw => (
                <div key={sw.id} className="switch-card">
                  <div className="switch-info">
                    <span className="switch-from">
                      {sw.old_stock_symbol} ({sw.old_stock_name})
                    </span>
                    <span className="switch-arrow">→</span>
                    <span className="switch-to">
                      {sw.new_stock_symbol} ({sw.new_stock_name})
                    </span>
                  </div>
                  <div className="switch-date">
                    Effective: {sw.effective_month}/{sw.effective_year}
                  </div>
                  <button
                    onClick={() => handleCancelSwitch(sw.id)}
                    className="cancel-switch-button"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="info-section">
          <h2>How It Works</h2>
          <ul>
            <li>Your portfolio is locked in for this month</li>
            <li>You can request one stock switch per month</li>
            <li>Switches take effect next month</li>
            <li>Portfolio value is calculated using monthly closing prices</li>
          </ul>
        </section>
      </div>

      {showSwitchModal && (
        <div className="modal-overlay" onClick={() => setShowSwitchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Request Stock Switch</h2>
            <p>Select a stock from your portfolio to switch out:</p>
            <select
              value={selectedOldStock || ''}
              onChange={(e) => setSelectedOldStock(Number(e.target.value))}
            >
              <option value="">Select stock to remove</option>
              {portfolio.map(item => (
                <option key={item.stock_id} value={item.stock_id}>
                  {item.symbol} - {item.name}
                </option>
              ))}
            </select>
            <p>Select a new stock to add:</p>
            <select
              value={selectedNewStock || ''}
              onChange={(e) => setSelectedNewStock(Number(e.target.value))}
            >
              <option value="">Select stock to add</option>
              {availableStocksForSwitch.map(stock => (
                <option key={stock.id} value={stock.id}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button onClick={handleRequestSwitch} className="confirm-button">
                Confirm Switch
              </button>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
