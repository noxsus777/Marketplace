# 🛒 Premium Sphere — Local Setup Guide

A digital marketplace for game keys, subscriptions, gift cards & software.

---

## 📋 Prerequisites

| Requirement | Download |
|---|---|
| **Python 3.10+** | [python.org](https://www.python.org/downloads/) |
| **Node.js 18+** | [nodejs.org](https://nodejs.org/) |
| **MongoDB Community** | [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) |

---

## 🗄️ Step 1 — Install & Start MongoDB

### Install MongoDB Community Edition (Windows)

1. Go to: https://www.mongodb.com/try/download/community
2. Select **Windows**, **MSI** package, and download
3. Run the installer — choose **Complete** setup
4. ✅ Check **"Install MongoDB as a Service"** — this starts MongoDB automatically on boot

### Verify MongoDB is running

Open PowerShell and run:
```powershell
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

You should see `"ok" : 1` in the output.

If not running manually, start it:
```powershell
net start MongoDB
```

---

## ⚙️ Step 2 — Configure Environment Variables

The `.env` files have already been created for you with the right defaults.

### Backend (`backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=marketplace_db
JWT_SECRET=super-secret-local-dev-key-change-in-production
ADMIN_EMAIL=admin@premiumsphere.com
ADMIN_PASSWORD=Admin@123
FRONTEND_URL=http://localhost:3000
```

> **Note:** Cloudinary credentials are set to `placeholder` — image upload in Admin panel won't work until you add real keys. Everything else works fine.

### Frontend (`frontend/.env`)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 🚀 Step 3 — Start the Application

### Option A: One-click launcher (Recommended)

Double-click **`start_all.bat`** in the project root.

This will open two terminal windows — one for the backend and one for the frontend.

---

### Option B: Start manually

**Terminal 1 — Backend:**
```batch
start_backend.bat
```
Or manually:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements_local.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```batch
start_frontend.bat
```
Or manually:
```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

---

## 🌐 Step 4 — Open in Browser

| Service | URL |
|---|---|
| **Frontend (App)** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |

---

## 🔑 Admin Login

| Field | Value |
|---|---|
| **Email** | `admin@premiumsphere.com` |
| **Password** | `Admin@123` |

The admin panel is at: http://localhost:3000/admin

---

## 📦 What Gets Auto-Created

On first backend start, the database is automatically seeded with:
- **6 categories**: Subscriptions, Gaming, Software, Gift Cards, AI & Tools, Game Top-Up
- **20 sample products**: Netflix, Spotify, Windows 11, GTA V, ChatGPT Plus, Steam cards, and more

No manual database setup needed!

---

## 🔧 Troubleshooting

### ❌ Backend crashes: `MONGO_URL` not set
Make sure `backend/.env` file exists. Check it contains `MONGO_URL=mongodb://localhost:27017`.

### ❌ Backend crashes: `KeyError: 'MONGO_URL'`
Same as above — the `.env` file must be in the `backend/` folder, not the root.

### ❌ Frontend can't connect to backend (CORS error)
Make sure the backend is running on port 8000. Check that `frontend/.env` has:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

### ❌ `npm install` fails
Try:
```powershell
npm install --legacy-peer-deps
```

### ❌ MongoDB connection refused
Start MongoDB service:
```powershell
net start MongoDB
```

### ❌ Port already in use
- Backend port 8000 in use: `netstat -ano | findstr :8000` → kill that PID
- Frontend port 3000 in use: React will ask to use port 3001 — press `Y`

---

## 🏗️ Project Structure

```
Marketplace-main/
├── backend/
│   ├── server.py          # FastAPI backend (all routes)
│   ├── .env               # ✅ Created — environment config
│   ├── requirements_local.txt  # ✅ Minimal dependencies
│   └── .venv/             # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # Auth & Cart context
│   │   └── lib/api.js     # Axios API client
│   ├── .env               # ✅ Created — backend URL
│   └── package.json       # Node dependencies
├── start_backend.bat      # ✅ Backend launcher
├── start_frontend.bat     # ✅ Frontend launcher
└── start_all.bat          # ✅ Launch everything at once
```

---

## 🔐 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TailwindCSS, Radix UI, Framer Motion |
| Backend | FastAPI, Python, Uvicorn |
| Database | MongoDB (via Motor async driver) |
| Auth | JWT (httpOnly cookies) |
| Images | Cloudinary (optional — needs account) |
