# Fantasy Investments

A web application for teaching kids about investing through a virtual stock portfolio game. Players start with £50 and select 10 stocks to invest in, with the ability to make optional monthly switches.

## Features

- **User Authentication**: Secure registration and login system
- **Initial Stock Selection**: Players select 10 stocks (£5 each) from available options
- **Monthly Locking**: Portfolios are locked for the current month
- **Optional Stock Switching**: Players can request one stock switch per month, effective next month
- **Admin Panel**: Admins can add/edit/delete stocks and record monthly closing prices
- **Portfolio Tracking**: View portfolio value based on monthly closing prices

## Technology Stack

- **Backend**: Node.js, Express, TypeScript, SQLite
- **Frontend**: React, TypeScript
- **Authentication**: JWT with bcrypt
- **Hosting**: Azure Web App

## Installation

### Prerequisites

- Node.js 18 or higher
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/asos-uzairkhan/fantasy-investments.git
cd fantasy-investments
```

2. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

3. Create environment file:
```bash
cp .env.example .env
# Edit .env and set your JWT_SECRET
```

4. Run in development mode:
```bash
npm run dev
```

The backend will run on http://localhost:3001 and the frontend on http://localhost:3000

## Building for Production

```bash
npm run build
npm start
```

## Azure Deployment

This application is configured for Azure Web App deployment:

1. Create an Azure Web App with Node.js 18 runtime
2. Configure environment variables in Azure:
   - `JWT_SECRET`: Your secret key for JWT tokens
   - `NODE_ENV`: production
3. Deploy using Git or Azure CLI

## Usage

### For Players

1. **Register**: Create an account with username, email, and password
2. **Initial Selection**: Select 10 stocks from the available list (£5 each)
3. **View Portfolio**: See your current holdings and portfolio value
4. **Request Switch**: Optionally request to switch one stock per month (takes effect next month)

### For Admins

1. **Manage Stocks**: Add, edit, or delete stocks from the available pool
2. **Record Prices**: Record monthly closing prices for each stock
3. **Monitor**: View all stocks and their current prices

## Database Schema

- **users**: User accounts and authentication
- **stocks**: Available stocks with symbols, names, sectors, and current prices
- **portfolios**: User stock holdings with allocations
- **monthly_prices**: Historical monthly closing prices
- **pending_switches**: Queued stock switches for next month

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user info

### Stocks
- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/:id` - Get single stock
- `POST /api/stocks` - Add stock (admin)
- `PUT /api/stocks/:id` - Update stock (admin)
- `DELETE /api/stocks/:id` - Delete stock (admin)
- `POST /api/stocks/:id/monthly-price` - Record monthly price (admin)

### Portfolio
- `GET /api/portfolio` - Get user's portfolio
- `POST /api/portfolio/initial-selection` - Make initial stock selection
- `GET /api/portfolio/pending-switches` - Get pending switches
- `POST /api/portfolio/switch` - Request stock switch
- `DELETE /api/portfolio/switch/:id` - Cancel pending switch
- `GET /api/portfolio/performance` - Get portfolio performance

## License

ISC
