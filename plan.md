# TaskMarket Implementation Plan (MERN)

## Problem Summary
Build a web marketplace where requesters post paid needs, fulfillers offer to complete them, and payment happens offline (outside the platform).  
The platform must support: authentication, need posting, offers/bids, acceptance, work lifecycle, in-app chat, ratings/reviews, and dual confirmation of offline payment.

## Proposed Approach
Create a MERN monorepo with a React frontend and Node.js/Express backend, backed by MongoDB.  
Model the core flow around a `Task` lifecycle with explicit status transitions and two-sided confirmations to safely close jobs without online payments.

## Workplan
- [x] TM-01: Initialize project structure (client, server, shared config) and environment setup
- [x] TM-02: Implement backend foundation (Express app, MongoDB connection, base middleware, validation, error handling)
- [x] TM-03: Implement authentication (register/login, JWT, password hashing, role support)
- [x] TM-04: Design and implement core data models:
  - [x] User profile
  - [x] Task/Need post
  - [x] Offer/Bid
  - [x] Chat conversation/message
  - [x] Review/Rating
  - [x] Offline payment confirmation fields
- [x] TM-05: Build task lifecycle APIs:
  - [x] Create/list/view/edit/cancel task posts
  - [x] Submit/withdraw offers
  - [x] Accept one offer and assign fulfiller
  - [x] Mark work submitted/completed
  - [x] Dual offline-payment confirmation and closure
- [x] TM-06: Build chat system:
  - [x] Conversation creation tied to accepted task
  - [x] Message send/list endpoints
  - [x] Real-time updates (Socket.IO) or near-real-time polling baseline
- [x] TM-07: Build ratings/reviews:
  - [x] Mutual review only after task closure
  - [x] Prevent duplicate reviews per party/task
  - [x] Aggregate rating fields for profiles
- [x] TM-08: Build frontend pages/components:
  - [x] Auth (signup/login)
  - [x] Task feed + filters/search
  - [x] Create/edit task post
  - [x] Task detail with offers and accept flow
  - [x] Task dashboard with lifecycle status and confirmations
  - [x] Chat UI
  - [x] Profile + reviews
- [x] TM-09: Add safety and trust features for MVP:
  - [x] Report/flag user or task
  - [x] Basic moderation/admin endpoints for flagged content
  - [x] Input sanitization and abuse guards (rate limits)
- [x] TM-10: Testing and quality gates:
  - [x] Backend unit/integration tests for task lifecycle rules
  - [x] Frontend component/integration tests for key flows
  - [x] End-to-end smoke tests for post→offer→complete→review

## Key Product Rules (MVP Decisions)
- Offline payments only; no escrow, card processing, or platform payout logic.
- A task is considered fully closed only after **both requester and fulfiller** confirm offline payment/completion.
- Reviews are enabled only after closure to reduce retaliatory misuse during active work.
- Chat is available for matched task participants.

## Notes / Considerations
- Since payment is offline, trust/dispute UX matters: include clear status indicators and confirmation prompts.
- Keep status transitions strict and server-validated to prevent inconsistent task states.
- Start with essential moderation tools to reduce spam/scam risk early.
