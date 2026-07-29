#!/usr/bin/env python3
"""
One-time script to seed Firebase with symbol price data from local CSV files,
and investment data from local investment CSV files (converted to monthly format).

Investment CSV format (data/investments/<Name>.csv):
  start_date,end_date,symbol

Firebase investment format (stored under /investments/<Name>/):
  { '2026_01': ['SYM1', ...], '2026_02': [...], ... }

Usage:
    uv run seed_firebase.py
    # or: python seed_firebase.py

Requirements:
    pip install requests
"""

import csv
import os
from datetime import datetime, timedelta

import requests

# ── Config ─────────────────────────────────────────────────────────────────────
DATABASE_URL = (
    "https://fantasy-investments-2026-default-rtdb.europe-west1.firebasedatabase.app"
)
SYMBOLS_DIR     = os.path.join(os.path.dirname(__file__), "..", "data", "symbols")
INVESTMENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "investments")
# ───────────────────────────────────────────────────────────────────────────────


def get_yesterday() -> str:
    return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")


def upload_symbol(symbol: str, prices: dict) -> bool:
    """PUT the full prices dict to /symbols/{symbol}/prices."""
    url = f"{DATABASE_URL}/symbols/{symbol}/prices.json"
    response = requests.put(url, json=prices, timeout=30)
    if response.status_code not in (200, 201):
        print(f"  ERROR {response.status_code}: {response.text[:120]}")
        return False
    return True


def set_meta(last_refresh: str) -> bool:
    url = f"{DATABASE_URL}/meta.json"
    response = requests.patch(
        url,
        json={"lastRefresh": last_refresh, "refreshInProgress": False},
        timeout=10,
    )
    return response.status_code in (200, 201)


def csv_to_monthly(investments: list[dict]) -> dict:
    """
    Convert CSV-format rows (start_date, end_date, symbol) to monthly format:
    { 'YYYY_MM': ['SYM1', 'SYM2', ...], ... }
    """
    monthly: dict[str, list[str]] = {}
    for inv in investments:
        symbol     = inv["symbol"]
        start_date = datetime.strptime(inv["start_date"], "%Y-%m-%d")
        end_date   = datetime.strptime(inv["end_date"],   "%Y-%m-%d")

        current = datetime(start_date.year, start_date.month, 1)
        end     = datetime(end_date.year,   end_date.month,   1)

        while current <= end:
            key = f"{current.year}_{str(current.month).zfill(2)}"
            if key not in monthly:
                monthly[key] = []
            if symbol not in monthly[key]:
                monthly[key].append(symbol)
            # Advance one month
            if current.month == 12:
                current = datetime(current.year + 1, 1, 1)
            else:
                current = datetime(current.year, current.month + 1, 1)

    return monthly


def upload_investments(participant: str, monthly_data: dict) -> bool:
    """PUT the monthly investment data to /investments/{participant}."""
    url = f"{DATABASE_URL}/investments/{participant}.json"
    response = requests.put(url, json=monthly_data, timeout=30)
    if response.status_code not in (200, 201):
        print(f"  ERROR {response.status_code}: {response.text[:120]}")
        return False
    return True


def seed_symbols() -> None:
    if not os.path.isdir(SYMBOLS_DIR):
        print(f"ERROR: Symbols directory not found: {SYMBOLS_DIR}")
        return

    csv_files = sorted(f for f in os.listdir(SYMBOLS_DIR) if f.endswith(".csv"))
    if not csv_files:
        print("ERROR: No CSV files found in symbols directory.")
        return

    print(f"Seeding {len(csv_files)} symbols into Firebase...\n")

    for filename in csv_files:
        symbol   = filename[:-4]  # strip .csv
        filepath = os.path.join(SYMBOLS_DIR, filename)

        prices: dict[str, float] = {}
        with open(filepath, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                date = row["date"].strip()
                try:
                    prices[date] = float(row["value"].strip())
                except ValueError:
                    pass  # skip malformed rows

        print(f"  {symbol:12s}  {len(prices):4d} days  ", end="", flush=True)
        print("OK" if upload_symbol(symbol, prices) else "FAILED")


def seed_investments() -> None:
    if not os.path.isdir(INVESTMENTS_DIR):
        print(f"WARNING: Investments directory not found: {INVESTMENTS_DIR}")
        return

    csv_files = sorted(f for f in os.listdir(INVESTMENTS_DIR) if f.endswith(".csv"))
    if not csv_files:
        print("WARNING: No investment CSV files found.")
        return

    print(f"\nSeeding {len(csv_files)} participants' investments into Firebase...\n")

    for filename in csv_files:
        participant = filename[:-4]  # strip .csv
        filepath    = os.path.join(INVESTMENTS_DIR, filename)

        investments: list[dict] = []
        with open(filepath, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                investments.append({
                    "symbol":     row["symbol"].strip(),
                    "start_date": row["start_date"].strip(),
                    "end_date":   row["end_date"].strip(),
                })

        monthly_data = csv_to_monthly(investments)
        print(
            f"  {participant:12s}  {len(monthly_data)} month(s)  ",
            end="",
            flush=True,
        )
        print("OK" if upload_investments(participant, monthly_data) else "FAILED")


def main():
    seed_symbols()

    yesterday = get_yesterday()
    print(f"\nSetting meta/lastRefresh = {yesterday} ... ", end="", flush=True)
    print("OK" if set_meta(yesterday) else "FAILED")

    # seed_investments()

    print("\nDone! The app will use Firebase data and skip a refresh on first login today.")


if __name__ == "__main__":
    main()
