# Interview Scheduling System

A backend service for managing interview scheduling between candidates and interviewers. The system ensures conflict-free scheduling, enforces interview status workflows, validates incoming requests, and provides structured error handling.

## Requirements

- **Node.js v22+** (uses built-in `node:sqlite` — no npm install needed)

## Project Structure

```
interview-scheduling-system/
├── src/
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── routes/         # API routes
│   ├── validators/     # Request validation
│   ├── middleware/     # Error handling & validation middleware
│   ├── database/       # Database setup
│   ├── app.js          # Application bootstrap
│   └── router.js       # Route registration
├── tests/              # Unit & integration tests
├── swagger.json        # OpenAPI specification
├── package.json
└── README.md
```

## Run

```bash
# Start the server (Node v22+, no npm install needed)
npm start
# or:
node --experimental-sqlite src/app.js
```

Server: `http://localhost:3000`  
Swagger JSON: `http://localhost:3000/api-docs`

## Tests

```bash
npm test
# or:
node --experimental-sqlite tests/run-tests.js
```

All 19 tests pass covering:
- Interviewer creation & validation
- Interview scheduling & conflict detection
- All valid and invalid status transitions
- Error handling & edge cases

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/interviewers` | Create interviewer |
| GET | `/interviewers` | List all interviewers |
| POST | `/interviews` | Schedule interview |
| GET | `/interviews` | List all interviews |
| PATCH | `/interviews/:id/status` | Update interview status |

## Status Workflow

```
SCHEDULED → CONFIRMED → COMPLETED
SCHEDULED → CANCELLED
CONFIRMED → CANCELLED
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Missing / invalid request fields |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `INTERVIEW_CONFLICT` | 409 | Overlapping interview for same interviewer |
| `NOT_FOUND` | 404 | Interviewer or interview not found |
| `INVALID_STATUS_TRANSITION` | 422 | Illegal status change |
