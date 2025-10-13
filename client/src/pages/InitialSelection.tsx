import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStocks, makeInitialSelection } from '../services/api';
import './InitialSelection.css';

interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
}

interface InitialSelectionProps {
  onComplete: () => void;
}

const InitialSelection: React.FC<InitialSelectionProps> = ({ onComplete }) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const toggleStock = (stockId: number) => {
    if (selectedStocks.includes(stockId)) {
      setSelectedStocks(selectedStocks.filter(id => id !== stockId));
    } else if (selectedStocks.length < 10) {
      setSelectedStocks([...selectedStocks, stockId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedStocks.length !== 10) {
      setError('Please select exactly 10 stocks');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await makeInitialSelection(selectedStocks);
      onComplete();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save selection');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading stocks...</div>;
  }

  return (
    <div className="initial-selection-container">
      <div className="initial-selection-card">
        <h1>Welcome to Fantasy Investments!</h1>
        <h2>Select Your First 10 Stocks</h2>
        <p className="instruction">
          You have £50 to invest. Select exactly 10 stocks (£5 each). These will be locked in for this month.
        </p>
        <div className="selection-info">
          <span>Selected: {selectedStocks.length} / 10</span>
          <span>Remaining: £{(50 - selectedStocks.length * 5).toFixed(2)}</span>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="stocks-grid">
          {stocks.map(stock => (
            <div
              key={stock.id}
              className={`stock-card ${selectedStocks.includes(stock.id) ? 'selected' : ''}`}
              onClick={() => toggleStock(stock.id)}
            >
              <h3>{stock.symbol}</h3>
              <p className="stock-name">{stock.name}</p>
              {stock.sector && <p className="stock-sector">{stock.sector}</p>}
              {stock.current_price && (
                <p className="stock-price">£{stock.current_price.toFixed(2)}</p>
              )}
              {selectedStocks.includes(stock.id) && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          ))}
        </div>
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={selectedStocks.length !== 10 || submitting}
        >
          {submitting ? 'Saving...' : 'Confirm Selection'}
        </button>
      </div>
    </div>
  );
};

export default InitialSelection;
