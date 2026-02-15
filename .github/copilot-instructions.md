# TaskMarket Copilot Instructions

## Product Context
TaskMarket is a MERN web app where:
- Requesters post paid needs (tasks).
- Fulfillers submit offers to complete tasks.
- Payment is done offline, outside the platform.

## Core Rules
- Never add online payment, escrow, wallet, or payout logic unless explicitly requested.
- Treat task closure as valid only after requester and fulfiller both confirm offline payment/completion.
- Allow reviews only after task closure.
- Keep status transitions explicit and validated server-side.

## Technical Conventions
- Stack target: MongoDB + Express + React + Node.js.
- Prefer small, typed, reusable modules over large files.
- Add input validation for all API writes.
- Keep API errors explicit and consistent.
- Follow existing folder/file patterns once scaffolding is created.

## Delivery Expectations
- Make minimal, surgical changes.
- Preserve existing behavior unless requirements explicitly change.
- Add/adjust tests when behavior changes.
