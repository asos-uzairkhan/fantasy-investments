# 🏆 Fantasy Investments 2026

A fun investment competition website for kids to learn about stocks, crypto, and commodities while competing to beat the S&P 500!

## 🌐 Hosting on GitHub Pages

1. Create a new repository on GitHub (e.g., `fantasy-investments-2026`)
2. Push all these files to the repository
3. Go to **Settings** → **Pages**
4. Under "Source", select **Deploy from a branch**
5. Select **main** branch and **/ (root)** folder
6. Click **Save**
7. Your site will be live at `https://yourusername.github.io/fantasy-investments-2026/`

## 📁 File Structure

```
fantasy-investments/
├── index.html          # Main website page
├── styles.css          # Styling
├── script.js           # JavaScript logic & charts
├── README.md           # This file
└── data/
    ├── sp500.csv          # S&P 500 daily values
    ├── investments/       # Individual participant investment files
    │   ├── Alice.csv
    │   ├── Bob.csv
    │   └── ...
    └── symbols/           # Individual symbol price data
        ├── AAPL.csv
        ├── BTC.csv
        ├── GOLD.csv
        └── ... (one CSV per symbol)
```

## 📊 CSV File Formats

### Participant Files (e.g., `data/investments/Alice.csv`)
Each participant has their own CSV file defining their investments and the date ranges they are active.

```csv
start_date,end_date,symbol
2026-01-01,2026-01-31,AAPL
2026-02-01,2026-02-28,BTC
```

- **start_date**: The date the investment begins (inclusive). Format: YYYY-MM-DD.
- **end_date**: The date the investment ends (inclusive). Format: YYYY-MM-DD.
- **symbol**: The ticker symbol (must match a file in `data/symbols/`).

### Symbol Data (e.g., `data/symbols/AAPL.csv`)
Daily price data for each investment option.

```csv
date,value
2026-01-01,150.50
2026-01-02,152.30
```

### S&P 500 Data (`data/sp500.csv`)
Benchmark data to compare performance against.

```csv
date,value
2026-01-01,4700.00
2026-01-02,4720.00
```

## 🎮 How It Works

1. **Starting Capital**: Everyone starts with £50.
2. **Daily Calculation**: On any given day, the system checks which investments are "active" for each participant based on the date ranges.
3. **Equal Weighting**: The £50 is split equally among all active investments for that day.
   - If you have 5 active investments, £10 is allocated to each.
   - If you have 10 active investments, £5 is allocated to each.
4. **Performance Tracking**: The portfolio value changes based on the performance of the underlying assets from their start date to the current date.
5. **Ranking**: Participants are ranked by their total portfolio value.

## 🛠️ Adding New Participants

1. Create a new CSV file in `data/investments/` (e.g., `Zoe.csv`).
2. Add the investment rows with start/end dates and symbols.
3. Add the participant's name to the `PARTICIPANTS` array in `script.js` if it's not automatically detected (the current script attempts to load a predefined list, so you might need to update the `PARTICIPANTS` constant in `script.js`).

## 🛠️ Adding New Symbols

1. Create a new CSV file in `data/symbols/` (e.g., `XYZ.csv`).
2. Add daily price data.
3. Use the symbol `XYZ` in any participant's investment file.
