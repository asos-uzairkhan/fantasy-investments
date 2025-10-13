import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getStocks,
  addStock,
  updateStock,
  deleteStock,
  recordMonthlyPrice,
} from '../services/api';
import './AdminPanel.css';

interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
}

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    sector: '',
    current_price: '',
  });
  const [priceData, setPriceData] = useState({
    price: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await getStocks();
      setStocks(response.data);
    } catch (err) {
      setError('Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStock({
        symbol: formData.symbol,
        name: formData.name,
        sector: formData.sector || undefined,
        current_price: formData.current_price ? parseFloat(formData.current_price) : undefined,
      });
      setSuccess('Stock added successfully');
      setShowAddModal(false);
      setFormData({ symbol: '', name: '', sector: '', current_price: '' });
      fetchStocks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add stock');
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    try {
      await updateStock(selectedStock.id, {
        symbol: formData.symbol,
        name: formData.name,
        sector: formData.sector || undefined,
        current_price: formData.current_price ? parseFloat(formData.current_price) : undefined,
      });
      setSuccess('Stock updated successfully');
      setSelectedStock(null);
      setFormData({ symbol: '', name: '', sector: '', current_price: '' });
      fetchStocks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update stock');
    }
  };

  const handleDeleteStock = async (stockId: number) => {
    if (!window.confirm('Are you sure you want to delete this stock?')) return;

    try {
      await deleteStock(stockId);
      setSuccess('Stock deleted successfully');
      fetchStocks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete stock');
    }
  };

  const handleRecordPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    try {
      await recordMonthlyPrice(
        selectedStock.id,
        parseFloat(priceData.price),
        priceData.month,
        priceData.year
      );
      setSuccess('Monthly price recorded successfully');
      setShowPriceModal(false);
      setSelectedStock(null);
      setPriceData({
        price: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record price');
    }
  };

  const openEditModal = (stock: Stock) => {
    setSelectedStock(stock);
    setFormData({
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector || '',
      current_price: stock.current_price ? stock.current_price.toString() : '',
    });
  };

  const openPriceModal = (stock: Stock) => {
    setSelectedStock(stock);
    setShowPriceModal(true);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <div className="header-actions">
          <Link to="/dashboard" className="back-link">
            Back to Dashboard
          </Link>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="admin-content">
        <div className="admin-actions">
          <button onClick={() => setShowAddModal(true)} className="add-button">
            Add New Stock
          </button>
        </div>

        <section className="stocks-section">
          <h2>Manage Stocks</h2>
          <table className="stocks-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Sector</th>
                <th>Current Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(stock => (
                <tr key={stock.id}>
                  <td>{stock.symbol}</td>
                  <td>{stock.name}</td>
                  <td>{stock.sector || '-'}</td>
                  <td>
                    {stock.current_price ? `£${stock.current_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="actions">
                    <button onClick={() => openEditModal(stock)}>Edit</button>
                    <button onClick={() => openPriceModal(stock)}>
                      Record Price
                    </button>
                    <button
                      onClick={() => handleDeleteStock(stock.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Stock</h2>
            <form onSubmit={handleAddStock}>
              <div className="form-group">
                <label>Symbol *</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Sector</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) =>
                    setFormData({ ...formData, sector: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Current Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.current_price}
                  onChange={(e) =>
                    setFormData({ ...formData, current_price: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="confirm-button">
                  Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStock && !showPriceModal && (
        <div className="modal-overlay" onClick={() => setSelectedStock(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Stock</h2>
            <form onSubmit={handleUpdateStock}>
              <div className="form-group">
                <label>Symbol *</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Sector</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) =>
                    setFormData({ ...formData, sector: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Current Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.current_price}
                  onChange={(e) =>
                    setFormData({ ...formData, current_price: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="confirm-button">
                  Update Stock
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStock(null)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPriceModal && selectedStock && (
        <div className="modal-overlay" onClick={() => setShowPriceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Record Monthly Price for {selectedStock.symbol}</h2>
            <form onSubmit={handleRecordPrice}>
              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={priceData.price}
                  onChange={(e) =>
                    setPriceData({ ...priceData, price: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Month *</label>
                <select
                  value={priceData.month}
                  onChange={(e) =>
                    setPriceData({ ...priceData, month: Number(e.target.value) })
                  }
                  required
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('default', {
                        month: 'long',
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Year *</label>
                <input
                  type="number"
                  value={priceData.year}
                  onChange={(e) =>
                    setPriceData({ ...priceData, year: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="confirm-button">
                  Record Price
                </button>
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
