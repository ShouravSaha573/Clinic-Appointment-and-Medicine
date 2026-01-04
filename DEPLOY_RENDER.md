# Deploy to Render (Backend + Frontend)

This repo has:
- `backend/` (Express API)
- `frontend/` (Vite + React static site)

## 1) Deploy the Backend (Render Web Service)

1. Create a **New > Web Service** on Render.
2. Connect your GitHub repo.
3. Set **Root Directory**: `backend`
4. Build Command: `npm install`
5. Start Command: `npm start`

### Backend environment variables (Render)
Set these in Render **Environment**:
- `NODE_ENV=production`
- `PORT=5000` (optional; Render sets `PORT` automatically, but keeping it is fine)
- `SECRET=<your JWT secret>`
- `MONGO_URI=<your MongoDB connection string>`
- `CORS_ORIGINS=<your frontend origin>`
  - Example: `https://your-frontend.onrender.com`

### Health check
- Use: `GET /api/health`

## 2) Deploy the Frontend (Render Static Site)

1. Create a **New > Static Site** on Render.
2. Connect the same GitHub repo.
3. Set **Root Directory**: `frontend`
4. Build Command: `npm install; npm run build`
5. Publish Directory: `dist`

### Frontend environment variables (Render)
Set these in Render **Environment**:
- `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com/api`

## 3) Cookie/Auth notes (important)

This project uses **httpOnly cookies** for auth.
When frontend and backend are on different domains (Render), cookies require:
- Backend cookies marked `Secure` and `SameSite=None` (enabled automatically when `NODE_ENV=production`).
- Backend CORS must allow the frontend origin via `CORS_ORIGINS`.
- Frontend requests must use `withCredentials: true` (already enabled in `frontend/src/lib/axios.js`).

## 4) Quick smoke test

- Open the frontend URL.
- Check API is reachable:
  - Visit: `https://<backend>.onrender.com/api/health`
- Try login/signup flows.
