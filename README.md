# Splitzy

A modern expense-splitting app with a React (Vite + Tailwind) frontend and an Express + MongoDB backend.

- Live Frontend: https://splitzy-six.vercel.app
- Live Backend: https://splitzy-813d.onrender.com

## Tech Stack
- Frontend: React 18, Vite, TailwindCSS, React Router, Axios
- Backend: Node.js, Express, Mongoose, JWT, bcrypt
- Database: MongoDB Atlas
- Deployment: Vercel (frontend), Render (backend)

## Monorepo Structure
```
splitzy/
├─ splitzy-client/        # Vite React frontend
│  ├─ src/
│  ├─ package.json
│  └─ vite.config.js
├─ splitzy-backend/       # Express + MongoDB backend
│  ├─ src/
│  │  ├─ app.js           # Express app (routes, middleware)
│  │  ├─ server.js        # Local prod/dev server (not used on Render build step)
│  │  ├─ routes/          # auth, groups, expenses
│  │  ├─ controllers/     # business logic
│  │  ├─ models/          # Mongoose schemas
│  │  └─ config/db.js     # Mongo connection
│  └─ package.json
└─ README.md              # This file
```

## Environment Variables

Frontend (Vite): set in Vercel Project → Settings → Environment Variables
- `VITE_API_URL` – Base API URL including `/api` suffix.
  - Example: `https://splitzy-813d.onrender.com/api`

Backend (Render): Settings → Environment
- `MONGODB_URI` – MongoDB Atlas connection string
- `JWT_SECRET` – Strong random string
- `CLIENT_ORIGIN` – Exact frontend origin (no trailing slash)
  - Example: `https://splitzy-six.vercel.app`
- `NODE_ENV` – `production`

## Local Development

Prereqs: Node 18+, pnpm/npm, MongoDB Atlas (or local Mongo).

1) Backend
```
cd splitzy-backend
cp .env.example .env   # if provided, else create and fill vars as above
npm install
npm run dev            # starts on http://localhost:5050
```
Health check: http://localhost:5050/api/health

2) Frontend
```
cd splitzy-client
# create .env and set VITE_API_URL=http://localhost:5050/api
npm install
npm run dev            # starts on http://localhost:5173
```

## Deployment

Recommended setup (used in production):
- Frontend → Vercel
- Backend → Render Web Service

### Backend on Render
1. Connect GitHub repo → Web Service → Base directory: `splitzy-backend`
2. Build command: `npm install`
3. Start command: `npm start`
4. Environment:
   - `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`
5. After deploy, verify:
   - `https://<service>.onrender.com/api/health` → `{ "status": "ok" }`

### Frontend on Vercel
1. Project base directory: `splitzy-client`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment:
   - `VITE_API_URL=https://<service>.onrender.com/api`
5. Redeploy and hard refresh (Cmd+Shift+R).


## Scripts

Frontend (splitzy-client):
- `npm run dev` – local dev
- `npm run build` – production build
- `npm run preview` – preview built app

Backend (splitzy-backend):
- `npm run dev` – nodemon dev server
- `npm start` – start server
