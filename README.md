# TaskMarket

TaskMarket is a MERN marketplace where users post paid needs and other users submit offers to complete them. Payment is handled offline and tasks close only after dual confirmation.

## Product Rules (MVP)

- Offline payment only (no escrow, wallet, or online payouts)
- Task closure requires confirmation from both requester and fulfiller
- Reviews are allowed only after task closure

## Workspace

- `client` Vite + React frontend
- `server` Express + MongoDB API
- `plan.md` implementation checklist and milestones

## Quick Start

1. Install dependencies from repo root:

   npm install

2. Copy environment template and update values:

   copy server\\.env.example server\\.env

   Admin bootstrap is automatic on server startup. Configure these in `server/.env`:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_FULL_NAME`

3. Run API + client together:

   npm run dev

   Or run each app separately:

   npm run dev:server

   npm run dev:client

4. Health check:

   GET http://localhost:4000/api/v1/health

5. Run tests:

   npm --workspace server run test

   npm --workspace client run test

6. Seed fake data (optional):

   npm run seed

   Append without clearing existing records:

   npm run seed:append

## API Groups

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:taskId`
- `PATCH /api/v1/tasks/:taskId`
- `POST /api/v1/tasks/:taskId/cancel`
- `POST /api/v1/tasks/:taskId/offers`
- `POST /api/v1/tasks/:taskId/offers/:offerId/withdraw`
- `POST /api/v1/tasks/:taskId/offers/:offerId/accept`
- `POST /api/v1/tasks/:taskId/work-submitted`
- `POST /api/v1/tasks/:taskId/confirm-offline`
- `GET /api/v1/tasks/mine`
- `POST /api/v1/chat/tasks/:taskId/conversation`
- `GET /api/v1/chat/conversations/:conversationId/messages`
- `POST /api/v1/chat/conversations/:conversationId/messages`
- `POST /api/v1/reviews`
- `GET /api/v1/reviews/user/:userId`
- `GET /api/v1/users/:userId`
- `POST /api/v1/reports`
- `GET /api/v1/reports/mine`
- `GET /api/v1/reports` (admin)
- `POST /api/v1/reports/:reportId/resolve` (admin)

## Frontend Routes

- `/reports/my` authenticated user report history
- `/admin/reports` admin-only moderation dashboard

## Notes
- Default local ports: API `4000`, client `5173`.