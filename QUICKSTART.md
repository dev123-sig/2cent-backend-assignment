# Quick Start Guide

## Prerequisites

- Node.js v18+
- MongoDB v6+
- npm

## Installation (5 minutes)

### 1. Install MongoDB

**Windows:**
```bash
# Download and install MongoDB Community Server from:
# https://www.mongodb.com/try/download/community

# Start MongoDB service
net start MongoDB
```

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

**Linux:**
```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### 2. Install Backend

```bash
cd backend
npm install
cp .env.example .env
```

### 3. Install Frontend

```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Run Both (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Production Build

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

## Access the Application

- **Frontend UI:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000
- **Health Check:** http://localhost:3000/healthz
- **Metrics:** http://localhost:3000/metrics

## First Steps

1. Open http://localhost:5173
2. Place a few buy orders at different prices
3. Place a sell order to trigger matching
4. Watch real-time updates in orderbook and trades

## Testing

### Run Unit Tests
```bash
cd backend
npm test
```

### Generate Fixtures
```bash
cd backend
npm run fixtures
```

### Run Load Test
```bash
cd backend
npm run load-test 60 50
```

## Troubleshooting

**MongoDB not running?**
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```

**Port already in use?**
Edit `backend/.env` and change `PORT=3000` to another port.

**WebSocket not connecting?**
Ensure backend is running and check `VITE_WS_URL` in frontend.

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Review [DESIGN.md](./DESIGN.md) for architecture details
- Check [LOAD_TEST_REPORT.md](./LOAD_TEST_REPORT.md) for performance analysis
- Import [postman_collection.json](./postman_collection.json) for API testing
