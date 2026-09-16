# Ministry LMS — Forgiven Generation Church

A full-stack Learning Management System built for ministry education. Students can browse and enrol in theology, scripture, and prayer courses; instructors build and publish course content; admins manage users and the platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy · SQLite (dev) / PostgreSQL (prod) |
| Frontend | Next.js 15 (App Router) · Tailwind CSS v4 · shadcn/ui |
| Auth | JWT (email/password) · Google OAuth (NextAuth) |
| Payments | Stripe (USD) · Razorpay (INR) |
| Video | AWS S3 · MediaConvert · CloudFront signed URLs |
| Email | AWS SES |

---

## Features

- **Three roles** — Student, Instructor, Admin
- **Course builder** — drag-and-drop module ordering, video / text / quiz modules, free-preview toggle, drip-content scheduling
- **Student dashboard** — enrolled courses, progress tracking, quiz scores
- **Payments** — INR and USD checkout, auto-enrolment on payment success, payment history
- **Notifications** — in-app bell with unread badge, per-event triggers
- **Admin panel** — user management, role assignment, course moderation

---

## Project Structure

```
ministry-lms/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/v1/           # Route handlers (auth, courses, enrollments, payments …)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic (payments, video, analytics)
│   │   └── core/             # Config, security, dependencies
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/                 # Next.js application
│   ├── app/
│   │   ├── (public)/         # Landing page, course catalog, course detail
│   │   ├── (auth)/           # Login, register
│   │   ├── (student)/        # Dashboard, learning view, billing
│   │   ├── (instructor)/     # Course builder, analytics
│   │   └── (admin)/          # User management, course moderation
│   ├── components/           # Shared UI components (Navbar, NotificationBell …)
│   └── lib/                  # API client, auth hooks, Zustand stores
├── docker-compose.yml
└── .env.example
```

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- npm or pnpm

### 1 — Clone the repo

```bash
git clone https://github.com/Jonah1309/LMS.git
cd LMS
```

### 2 — Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit environment variables
cp ../.env.example .env
# Edit .env — at minimum set JWT_SECRET to a random string

# Run database migrations
alembic upgrade head

# Start the API server (http://localhost:8000)
uvicorn app.main:app --reload
```

Interactive API docs are available at `http://localhost:8000/docs`.

### 3 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit environment variables
cp ../.env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000 is the key one for local dev

# Start the dev server (http://localhost:3000)
npm run dev
```

### 4 — Create your first admin account

1. Register at `http://localhost:3000/register`
2. Open a terminal in the `backend/` folder and run:

```bash
python -c "
import sqlite3
conn = sqlite3.connect('lms.db')
conn.execute(\"UPDATE users SET role='admin', is_verified=1 WHERE email='YOUR_EMAIL'\")
conn.commit()
conn.close()
print('Done')
"
```

Replace `YOUR_EMAIL` with the address you registered with.

---

## Docker (optional)

```bash
# From the repo root
docker-compose up
```

This starts the backend and (if configured) a PostgreSQL container.  
Switch to PostgreSQL by setting `DATABASE_URL=postgresql://...` in your `.env`.

---

## Environment Variables

Copy `.env.example` to `backend/.env` and `frontend/.env.local` and fill in the values you need.

| Variable | Required for |
|---|---|
| `JWT_SECRET` | Auth (any random string works locally) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth login |
| `STRIPE_SECRET_KEY` | USD payments |
| `RAZORPAY_KEY_ID/SECRET` | INR payments |
| `AWS_*` / `S3_*` / `CLOUDFRONT_*` | Video upload & streaming |
| `SES_FROM_EMAIL` | Transactional emails |

For local development only JWT_SECRET and the database URL are required.

---

## License

MIT
