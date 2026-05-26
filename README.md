# 🏆 Fantasy Investments 2026

A fun investment competition website for kids to learn about stocks, crypto, and commodities while competing to beat the S&P 500!

## 🔐 Authentication

The site requires a username and password to log in. Passwords are stored securely (SHA-256 hashed) in **Firebase Realtime Database**, so they work across all devices and locations worldwide.

### Default Passwords
Each participant's default password is their **username in lowercase** (e.g. `alpha` for Alpha, `bravo` for Bravo). The admin default password is `admin123`.

### Admin Account
Log in with username `admin` to access the admin panel. From there you can:
- **Reset to Default** — reverts the user to their lowercase-username default
- **Set Password** — assign a specific new password for any participant

Changes take effect immediately on all devices.

### Changing Your Password
Once logged in, click **🔑 Change Password** in the header bar. Enter your current password and choose a new one (minimum 4 characters).

### Forgotten Password (Admin Reset)
Log in as `admin` → find the user in the table → click **Reset to Default** or **Set Password**.

---

## 🔥 Firebase Setup (Required for first deployment)

The site uses [Firebase Realtime Database](https://firebase.google.com) to store password hashes in the cloud.

### Step 1 — Create a Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**, follow the prompts
3. In the left sidebar: **Build → Realtime Database → Create Database**
4. Choose a region and start in **test mode** (you'll update the rules next)

### Step 2 — Get your Web Config
1. In Firebase Console: **Project Settings (⚙️) → Your apps → </> Add app**
2. Register the app, then copy the `firebaseConfig` values
3. Open `firebase-config.js` and fill in all the placeholder values

### Step 3 — Set Security Rules
1. In Firebase Console: **Realtime Database → Rules**
2. Replace the rules with the contents of `firebase-rules.json` (in this repo)
3. Click **Publish**

### Step 4 — Deploy
Push the repo to GitHub Pages as normal. On the first page load with Firebase configured, the site will automatically seed your Firebase database from `data/passwords.json`.

### Adding New Participants
After adding a new `.csv` to `data/investments/`, run:
```bash
uv run python scripts/generate_passwords.py
```
Then manually add the new user's entry in Firebase Console (**Realtime Database → passwords → users**), or delete the entire `passwords` node so the site re-seeds from the updated `passwords.json` on next load.

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
