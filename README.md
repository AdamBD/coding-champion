# Coding Champion 🎮

A gamified learning platform to track your software engineering journey with
RPG-style progression.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Nitro (h3)
- **Database**: PostgreSQL

## Setup

### Prerequisites

- Node.js (v20+)
- PostgreSQL (running locally or remote)

### Database Setup

1. Create a PostgreSQL database:

```bash
createdb coding_champion
```

2. Run the schema:

```bash
psql coding_champion < backend/db/schema.sql
```

3. Create a `.env` file in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your PostgreSQL credentials.

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Project Structure

```
coding-champion/
├── frontend/          # React + Vite app
├── backend/           # Nitro server
│   ├── server/        # API routes and handlers
│   ├── db/            # Database schema and migrations
│   └── nitro.config.ts
└── README.md
```

## Next Steps

- [ ] Build the gamification UI components
- [ ] Implement XP and leveling system
- [ ] Add quest/challenge tracking
- [ ] Create achievement system
- [ ] Add skill tree visualization
