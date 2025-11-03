# Splitzy Backend

Express + MongoDB backend for Splitzy expense splitter.

## Setup
1. Copy `.env.example` to `.env` and set values (you already have `.env`).
2. Install deps:
```bash
npm install
```
3. Run dev:
```bash
npm run dev
```

API base: `http://localhost:${PORT}/api`

## Routes
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- Groups: `GET /api/groups`, `POST /api/groups`, `PUT /api/groups/:id`, `DELETE /api/groups/:id`
- Expenses: `GET /api/expenses`, `GET /api/expenses/group/:groupId`, `POST /api/expenses`, `PUT /api/expenses/:id`, `DELETE /api/expenses/:id`, `GET /api/expenses/stats`

Auth required for groups/expenses. Set `VITE_API_URL` in client to `http://localhost:5050/api`.
