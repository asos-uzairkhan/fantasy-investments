#!/usr/bin/env python3
"""
Generate symbol CSV files from historical stock market data.
Uses yfinance to fetch data from Yahoo Finance.

Usage:
    python generate_symbols.py --start 2026-01-01 --end 2026-12-31
    python generate_symbols.py --start 2026-01-01 --end 2026-12-31 --symbols AAPL,MSFT,GOOGL
"""

import argparse
import os
from datetime import datetime
import yfinance as yf
import pandas as pd


# List of all available symbols organized by type
FUNDS = [
    '^GSPC',  # S&P 500 Index
    'DIA',  # Dow Jones Industrial Average
    'HLAL',  # Wahed FTSE USA Shariah ETF
    'UMMA',  # Wahed Dow Jones Islamic World ETF
    'QQQ',  # Invesco QQQ Trust
    'HIWS.L',  # HSBC Islamic World Equity Index Fund
    'ISWDL.XC',  # iShares MSCI World Islamic UCITS ETF
]

STOCKS = [
    'AAPL',         # Apple
    'AMD',          # Advanced Micro Devices
    'AMZN',         # Amazon
    'ASML',         # ASML Holding
    'AXP',          # American Express
    'AZN.L',        # AstraZeneca
    'AVGO',         # Broadcom
    'BAC',          # Bank of America
    'BP.L',         # BP (British Petroleum)
    'BRK-B',        # Berkshire Hathaway
    'BYDDF',        # BYD Company Limited
    'FSLR',         # First Solar, Inc.
    'GOOGL',        # Alphabet/Google
    'GSK.L',        # GlaxoSmithKline Pharmaceuticals
    'LLY',          # Eli Lilly and Company
    'JNJ',          # Johnson & Johnson
    'JPM',          # JPMorgan Chase
    'MA',           # Mastercard
    'META',         # Meta Platforms
    'MSFT',         # Microsoft
    'MU',           # Micron Technology
    'NOVN.SW',      # Novartis
    'NVDA',         # NVIDIA
    'PG',           # Procter & Gamble
    'PYPL',         # PayPal
    'SHEL',         # Shell
    'SLB',          # Schlumberger
    'SONY',         # Sony
    'ROG.SW',       # Roche Holding AG
    'TSLA',         # Tesla
    'V',            # Visa
    '005930.KS',    # Samsung Electronics
    '2222.SR',      # Saudi Arabian Oil Company
    'OMER',         # Omeros Corporation
    'QBTS',         # D-Wave Quantum Inc.
    'QCOM',         # Qualcomm
    'CJ6.F',        # Cameco Corporation
    'SSW.JO',       # Sibanye Stillwater Limited
    'MRNA',         # Moderna
    'KO',           # Coca Cola
    'NKE',          # Nike
    'VOW3.DE',      # Volkswagen AG
]

CRYPTO = [
    'BTC-GBP',   # Bitcoin
    'DOGE-GBP',  # Dogecoin
    'ETH-GBP',   # Ethereum
    'SHIB-GBP',  # Shiba Inu
    'SOL-GBP',   # Solana
    'USDT-USD',  # Tether
]

COMMODITIES = [
    'GC=F',       # Gold
    'CL=F',       # Crude Oil
    'SI=F',       # Silver
    'HG=F',       # Copper
    'ZW=F',       # Wheat
    'ALI=F',      # Aluminium
]

# Combined list of all available symbols
ALL_SYMBOLS = FUNDS + STOCKS + CRYPTO + COMMODITIES

# Mapping for symbols to make them more readable.
SYMBOL_MAPPING = {
    '^GSPC': 'SPX',
    'BTC-GBP': 'BTC',
    'DOGE-GBP': 'DOGE',
    'ETH-GBP': 'ETH',
    'SHIB-GBP': 'SHIB',
    'SOL-GBP': 'SOL',
    'USDT-USD': 'USDT',
    'GC=F': 'GOLD',
    'SI=F': 'SILVER',
    'CL=F': 'OIL',
    'HG=F': 'COPPER',
    'ZW=F': 'WHEAT',
    'ALI=F': 'ALUMINIUM',
    '005930.KS': 'SAMSUNG',
    '2222.SR': 'ARAMCO',
    'AZN.L': 'AZN',
    'GSK.L': 'GSK',
    'BP.L': 'BP',
    'BRK-B': 'BRK',
    'ROG.SW': 'ROG',
    'HIWS.L': 'HIWS',
    'NOVN.SW': 'NOVN',
    'CJ6.F': 'CJ6',
    'SSW.JO': 'SSW',
    'VOW3.DE': 'VOW3',
    'ISWDL.XC': 'ISWD',
}


def fetch_stock_data(symbol, start_date, end_date):
    """
    Fetch historical stock data using yfinance.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        start_date: Start date as string (YYYY-MM-DD)
        end_date: End date as string (YYYY-MM-DD)
    
    Returns:
        DataFrame with columns ['date', 'value'] or None if fetch fails
    """
    try:
        print(f"Fetching data for {symbol}...", end=' ', flush=True)
        
        # Download data from Yahoo Finance
        data = yf.download(
            symbol,
            start=start_date,
            end=end_date,
            progress=False,
            auto_adjust=True
        )
        
        if data.empty:
            print("No data found")
            return None
        
        # Reset index to make date a column
        data_reset = data.reset_index()
        
        # Get date and close price
        dates = data_reset['Date'].dt.strftime('%Y-%m-%d').values
        closes = data_reset['Close'].values
        
        # Flatten if needed
        if closes.ndim > 1:
            closes = closes.flatten()
        
        # Create DataFrame
        df = pd.DataFrame({
            'date': dates,
            'value': closes
        })
        
        print(f"✓ ({len(df)} records)")
        return df
    
    except Exception as e:
        print(f"Error: {e}")
        return None


def save_csv(df, symbol, output_dir):
    """Save DataFrame to CSV file."""
    if df is None or df.empty:
        return False
    
    # Normalize symbol name for filename (remove dashes)
    filename = SYMBOL_MAPPING.get(symbol, symbol) + '.csv'
    filepath = os.path.join(output_dir, filename)
    
    df.to_csv(filepath, index=False)
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Generate symbol CSV files from historical stock data'
    )
    parser.add_argument(
        '--start',
        type=str,
        required=True,
        help='Start date (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--end',
        type=str,
        required=True,
        help='End date (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--symbols',
        type=str,
        help='Comma-separated list of symbols to fetch (default: all)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=os.path.join(os.path.dirname(__file__), '..', 'data', 'symbols'),
        help='Output directory for CSV files'
    )
    
    args = parser.parse_args()
    
    # Validate dates
    try:
        datetime.strptime(args.start, '%Y-%m-%d')
        datetime.strptime(args.end, '%Y-%m-%d')
    except ValueError:
        print("Error: Dates must be in YYYY-MM-DD format")
        return 1
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output, exist_ok=True)
    
    # Determine which symbols to fetch
    symbols = ALL_SYMBOLS
    if args.symbols:
        symbols = [s.strip().upper() for s in args.symbols.split(',')]
    
    # Remove duplicates and sort
    symbols = sorted(list(set(symbols)))
    
    print(f"\nGenerating {len(symbols)} symbol files")
    print(f"Date range: {args.start} to {args.end}")
    print(f"Output directory: {args.output}\n")
    
    successful = 0
    failed = 0
    
    for symbol in symbols:
        df = fetch_stock_data(symbol, args.start, args.end)
        if save_csv(df, symbol, args.output):
            successful += 1
        else:
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Successfully generated: {successful} files")
    print(f"Failed: {failed} files")
    print(f"{'='*50}")
    
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    main()
