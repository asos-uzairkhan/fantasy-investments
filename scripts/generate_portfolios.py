#!/usr/bin/env python3
"""
Generate random investment portfolios for participants.
Creates CSV files with 10 randomly selected symbols per participant.
Ensures at least 1 symbol from each type: Stocks, Crypto, and Commodities.
"""

import os
import random
import pandas as pd

# Define symbols directly to avoid importing yfinance
FUNDS = [
    'SPX',  # S&P 500 Index
    'DIA',  # Dow Jones Industrial Average
]

STOCKS = [
    'AAPL', 'AMD', 'AMZN', 'AVGO',
    'BP', 'EA', 'GOOGL', 'JNJ', 'JPM',
    'META', 'MSFT', 'NFLX', 'NVDA',
    'PG', 'PLTR', 'QQQ', 'RBLX', 'RIOT', 'RIVN',
    'SHEL', 'SLB', 'SONY', 'TSLA', 'TTWO',
]

CRYPTO = [
    'BTC-USD', 'DOGE-USD', 'ETH-USD', 'SHIB-USD', 'SOL-USD',
]

COMMODITIES = [
    'GOLD', 'OIL', 'SILVER',
]

# Participants using military phonetic alphabet
PARTICIPANTS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India']

# Date range
START_DATE = '2025-01-01'
END_DATE = '2025-12-31'

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'data', 'investments')


def generate_portfolio():
    """
    Generate a random portfolio of 10 symbols with at least 1 from each type.
    
    Returns:
        List of 10 symbol strings
    """
    # Start with 1 from each type (3 total)
    portfolio = [
        random.choice(STOCKS),
        random.choice(CRYPTO),
        random.choice(COMMODITIES),
    ]
    
    # Add 7 more random symbols from all available
    all_symbols = STOCKS + CRYPTO + COMMODITIES
    remaining = random.choices(all_symbols, k=7)
    portfolio.extend(remaining)
    
    # Remove duplicates by converting to set and back, then shuffle
    portfolio = list(set(portfolio))
    
    # If we have duplicates that reduced our count, add more to reach 10
    while len(portfolio) < 10:
        portfolio.append(random.choice(all_symbols))
    
    # Ensure exactly 10 by trimming if needed
    portfolio = portfolio[:10]
    
    return sorted(portfolio)


def create_portfolio_csv(participant, symbols, output_dir):
    """
    Create a CSV file for a participant's portfolio.
    
    Args:
        participant: Name of the participant
        symbols: List of 10 symbols
        output_dir: Directory to save the CSV file
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Create DataFrame
    df = pd.DataFrame({
        'start_date': [START_DATE] * len(symbols),
        'end_date': [END_DATE] * len(symbols),
        'symbol': symbols
    })
    
    # Save to CSV
    filepath = os.path.join(output_dir, f'{participant}.csv')
    df.to_csv(filepath, index=False)
    print(f"✓ Created {participant}.csv with symbols: {', '.join(symbols)}")


def main():
    print(f"Generating portfolios for {len(PARTICIPANTS)} participants\n")
    
    for participant in PARTICIPANTS:
        portfolio = generate_portfolio()
        create_portfolio_csv(participant, portfolio, OUTPUT_DIR)
    
    print(f"\n{'='*50}")
    print(f"Successfully created {len(PARTICIPANTS)} portfolio files")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"{'='*50}")


if __name__ == '__main__':
    main()
