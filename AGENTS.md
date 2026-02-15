# AGENTS.md

## Scope
These instructions apply to coding agents working in this repository.

## Build Priorities
1. Ship a working MERN marketplace for offline-paid task fulfillment.
2. Keep implementations simple and secure before adding complexity.
3. Enforce lifecycle integrity for tasks, offers, chat, and reviews.

## Required Guardrails
- No online payment processing.
- No broad try/catch that hides failures.
- No destructive refactors unless requested.
- Reuse existing helpers and patterns when available.

## Preferred Workflow
1. Read relevant files first.
2. Propose minimal change set.
3. Implement.
4. Run existing tests/build checks.
5. Report exactly what changed and what was verified.
