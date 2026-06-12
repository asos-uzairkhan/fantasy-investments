#!/usr/bin/env python3
"""
One-time script to seed Firebase with symbol price data from local CSV files.
Also sets meta/lastRefresh so the app knows data is current and skips a
client-side refresh on the first login.

Usage:
    uv run seed_firebase.py
    # or: python seed_firebase.py

Requirements:
    pip install requests
    (requests is already available if you have uv/the project env)

The script uses the Firebase REST API directly — no service account needed,
because the database rules allow unauthenticated writes to /symbols and /meta.
"""

import csv
import os
from datetime import datetime, timedelta

import requests

# ── Config ─────────────────────────────────────────────────────────────────────
DATABASE_URL = (
    "https://fantasy-investments-2026-default-rtdb.europe-west1.firebasedatabase.app"
)
SYMBOLS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "symbols")
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


def main():
    if not os.path.isdir(SYMBOLS_DIR):
        print(f"ERROR: Symbols directory not found: {SYMBOLS_DIR}")
        return

    csv_files = sorted(f for f in os.listdir(SYMBOLS_DIR) if f.endswith(".csv"))
    if not csv_files:
        print("ERROR: No CSV files found in symbols directory.")
        return

    print(f"Seeding {len(csv_files)} symbols into Firebase...\n")

    for filename in csv_files:
        symbol = filename[:-4]  # strip .csv
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

    yesterday = get_yesterday()
    print(f"\nSetting meta/lastRefresh = {yesterday} ... ", end="", flush=True)
    print("OK" if set_meta(yesterday) else "FAILED")
    print("\nDone! The app will use Firebase data and skip a refresh on first login today.")


if __name__ == "__main__":
    main()
