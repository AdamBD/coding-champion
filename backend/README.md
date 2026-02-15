# Backend - Coding Champion

Nitro (h3) backend server for Coding Champion.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
backend/
├── server/
│   ├── routes/        # API routes
│   ├── utils/         # Utility functions
│   └── middleware/    # Middleware (CORS, etc.)
├── db/                # Database schema and migrations
└── vitest.config.ts   # Vitest configuration
```

## API Routes

- `GET /api/health` - Health check
- `GET /api/stats` - User statistics
- `GET /api/activities` - User activities
- `POST /api/activities` - Create activity
- `GET /api/quests` - List all quests
- `GET /api/user-quests` - Get user's quest progress
- `POST /api/user-quests` - Start a quest
- `POST /api/quest-steps` - Complete a quest step
- `DELETE /api/quest-steps` - Uncomplete a quest step

## Database

PostgreSQL database. See `db/schema.sql` for schema.

## Environment Variables

Create a `.env` file:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coding_champion
DB_USER=postgres
DB_PASSWORD=postgres
```
