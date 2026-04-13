# Splitzy - Production-Ready Expense Splitting System

A comprehensive expense splitting application similar to Splitwise, built with modern microservices architecture. Features advanced group management, multiple split types, ML-powered expense categorization, real-time updates, and comprehensive analytics.

## 🏗️ Architecture

### Microservices Design
- **Frontend**: React + Vite + TailwindCSS (Port 5173)
- **Backend API**: Node.js + Express + MongoDB (Port 5050)
- **Analytics Service**: Python FastAPI + ML + PostgreSQL (Port 8001)
- **Real-time**: Socket.IO for live updates
- **Authentication**: JWT + OAuth (Google, Apple)

### Technology Stack

#### Frontend (`splitzy-client`)
- React 18 with modern hooks
- Vite for fast development and building
- TailwindCSS for responsive design
- React Router for navigation
- Axios for API communication
- Socket.IO Client for real-time updates
- Vitest + Testing Library for unit tests
- Playwright for E2E testing

#### Backend (`splitzy-backend`)
- Node.js with ES modules
- Express.js REST API
- MongoDB with Mongoose ODM
- JWT authentication with refresh tokens
- Passport.js for OAuth integration
- Socket.IO for real-time features
- Vitest for comprehensive testing
- Security middleware (Helmet, CORS, Rate limiting)

#### Python Service (`python-service`)
- FastAPI for high-performance analytics
- Scikit-learn for ML categorization
- PostgreSQL for analytics warehouse
- Pandas for data processing
- NetworkX for settlement optimization
- Pytest for testing

## 📁 Project Structure

```
splitzy/
├── splitzy-client/          # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API service layers
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   ├── e2e/                # Playwright E2E tests
│   └── public/             # Static assets
├── splitzy-backend/         # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Configuration files
│   │   └── realtime/       # Socket.IO handlers
│   └── test/               # Backend tests
├── python-service/          # Python analytics microservice
│   ├── app/
│   │   ├── routes/         # FastAPI endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Pydantic models
│   │   ├── ml/             # Machine learning models
│   │   └── etl/            # Data pipeline scripts
│   ├── tests/              # Python tests
│   └── sql/migrations/     # PostgreSQL schema
└── README.md               # This file
```

## 🚀 Features

### Core Functionality
- **Advanced Group Management**: Create groups with roles, invite system, temporary users
- **Multiple Split Types**: Equal, unequal fixed amounts, percentage, shares, manual
- **Real-time Updates**: Live expense updates and balance changes
- **Smart Settlement**: Optimized debt settlement algorithms
- **Budget Tracking**: Monthly budgets with insights and alerts

### Advanced Features
- **ML-Powered Categorization**: Automatic expense categorization using NLP
- **OAuth Authentication**: Google and Apple sign-in integration
- **Analytics Dashboard**: Spending trends and insights
- **Anomaly Detection**: Unusual spending pattern alerts
- **Power BI Integration**: Advanced reporting warehouse
- **Comprehensive Testing**: Unit, integration, and E2E test coverage

## 🔧 Environment Variables

### Backend (`.env`)
```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/splitzy
PORT=5050

# Python Service Integration
PYTHON_SERVICE_URL=http://localhost:8001
PYTHON_SERVICE_TIMEOUT_MS=8000
PYTHON_SERVICE_RETRIES=2

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret

# CORS & URLs
CLIENT_ORIGIN=http://localhost:5173
API_PUBLIC_URL=http://localhost:5050

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
```

### Python Service (`.env`)
```env
APP_NAME=Splitzy Python Service
APP_ENV=development
APP_PORT=8001
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=splitzy

# Optional: PostgreSQL for analytics warehouse
REPORTING_DATABASE_URL=postgresql://user:pass@localhost:5433/splitzy_reporting
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5050/api
VITE_SOCKET_URL=http://localhost:5050
```

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB 6.0+
- PostgreSQL 14+ (optional, for analytics)

### 1. Clone Repository
```bash
git clone https://github.com/Ayushkalmodia/Splitzy.git
cd Splitzy
```

### 2. Backend Setup
```bash
cd splitzy-backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Python Service Setup
```bash
cd python-service
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 4. Frontend Setup
```bash
cd splitzy-client
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 5. Access Applications
- Frontend: http://localhost:5173
- Backend API: http://localhost:5050
- Python Service: http://localhost:8001/docs (Swagger UI)

## 🧪 Testing

### Backend Tests
```bash
cd splitzy-backend
npm test                # Run all tests
npm run test:watch      # Watch mode
```

### Frontend Tests
```bash
cd splitzy-client
npm test                # Unit tests
npm run test:e2e        # E2E tests
```

### Python Service Tests
```bash
cd python-service
PYTHONPATH=. python -m pytest tests/
```

## 🚀 Deployment

### Backend (Render.com)
1. Connect repository to Render
2. Set environment variables
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Health Check: `/api/health`

### Frontend (Vercel)
1. Connect repository to Vercel
2. Root Directory: `splitzy-client`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Set `VITE_API_URL` to deployed backend URL

### Python Service (Render/Fly.io)
1. Deploy as separate service
2. Set environment variables
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 📊 Live URLs

- **Frontend**: https://splitzy-client.vercel.app
- **Backend API**: https://splitzy-backend.onrender.com
- **API Documentation**: https://splitzy-backend.onrender.com/api/docs

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/oauth/google` - Google OAuth
- `GET /api/auth/oauth/apple` - Apple OAuth

### Groups
- `GET /api/groups` - List user groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/spending-trends` - Spending trends
- `GET /api/analytics/category-insights` - Category insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ using modern web technologies
