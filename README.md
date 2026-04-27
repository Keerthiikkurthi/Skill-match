# Resume Analyzer

An AI-powered resume analysis web application with ATS scoring, TF-IDF keyword matching, and CNN-based semantic embeddings.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend        │────▶│  API Server       │────▶│  ML Service     │
│  React + Vite   │     │  Node.js/Express  │     │  Python/FastAPI │
│  :8080          │     │  :3001            │     │  :8000          │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                  │
                         ┌────────▼────────┐
                         │  SQLite DB       │
                         │  (backend/data/) │
                         └─────────────────┘
```

## Quick Start

### 1. Frontend

```bash
npm install
npm run dev
```

### 2. API Server (Node.js)

```bash
cd backend
npm install
npm run dev
```

### 3. ML Service (Python)

```bash
cd ml-service
python3 -m venv venv
# Windows: venv\Scripts\activate
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Environment Variables

**Frontend** (`.env`):
```
VITE_API_URL=http://localhost:3001
```

**Backend** (`backend/.env`):
```
PORT=3001
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
ML_SERVICE_URL=http://localhost:8000
DB_PATH=./data/resume_analyzer.db
CORS_ORIGIN=http://localhost:8080
```

**ML Service** (`ml-service/.env`):
```
ENV=development
ALLOWED_ORIGINS=http://localhost:3001
PORT=8000
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | No | Create account |
| POST | `/auth/signin` | No | Sign in, get JWT |
| GET | `/profile` | JWT | Get profile |
| PATCH | `/profile` | JWT | Update profile |
| POST | `/analyses` | JWT | Submit resume for analysis |
| GET | `/analyses` | JWT | Get all analyses |
| DELETE | `/analyses/:id` | JWT | Delete an analysis |

## ML Service Endpoint

| Method | Path | Description |
|--------|------|-------------|
| POST | `/score` | Score resume text against job description |

**Request:**
```json
{
  "resume_text": "...",
  "job_description": "..." 
}
```

**Response:**
```json
{
  "ats_score": 78,
  "matched_keywords": ["python", "machine learning"],
  "missing_keywords": ["docker", "kubernetes"],
  "semantic_similarity": 0.82,
  "feedback": ["Consider adding key terms: docker, kubernetes."],
  "word_count": 450
}
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS
- **API Server**: Node.js, Express, better-sqlite3, bcryptjs, JWT
- **ML Service**: Python, FastAPI, scikit-learn (TF-IDF + SVD/CNN embeddings)
- **Database**: SQLite (via better-sqlite3)
