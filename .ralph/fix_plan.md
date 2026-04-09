# Ralph Fix Plan — autonomo-tax

## Phase 1: Foundation
- [ ] Set up Vite + React project structure in ~/projects/autonomo-tax/
- [ ] Create Supabase migrations: profiles, invoices, expenses, quarterly_summaries tables
- [ ] Replace window.storage with Supabase client (create supabase.js)
- [ ] Wire up Supabase Auth (email/password)
- [ ] Move autonomo-tax-prep.jsx into new src/ structure as starting point

## Phase 2: Invoice & Expense Management
- [ ] Full CRUD for invoices against Supabase
- [ ] Full CRUD for expenses against Supabase
- [ ] File upload to Supabase Storage (invoices + receipts)
- [ ] AI parsing via Claude API (direct from client, not edge function)
- [ ] Quarter/year filtering on invoice and expense lists
- [ ] Inline FX rate editing with Supabase persistence

## Phase 3: Modelo 303 & 130
- [ ] All Casilla components wired to live Supabase-calculated values
- [ ] Prior quarter data entry for Modelo 130 cumulative YTD logic
- [ ] Prior 303 entries for Modelo 303 offset
- [ ] Quarter selector and year selector in header

## Phase 4: Polish
- [ ] Summary dashboard with currency conversion table
- [ ] Profile management (NIF, home office %)
- [ ] Error handling + edge cases (empty states, rate limit errors)
- [ ] Mobile responsiveness
- [ ] Remove all console.log statements

## Completed
- [x] Ralph enabled for project
- [x] PROMPT.md written with full project spec

## Notes
- Supabase MCP servers already configured — do NOT create new ones
- Auth via Supabase Auth (email/password or Google)
- Storage via Supabase Storage buckets
- Claude API calls go direct from client (no edge function needed)
- Use superpowers skills: `skill: brainstorming`, `skill: writing-plans`, `skill: tdd`, `skill: verification-before-completion`
- Use GSD skills: `skill: gsd-plan-phase`, `skill: gsd-execute-phase`, `skill: gsd-verify-work`, `skill: gsd-next`
- Use ui-ux-pro-max for all UI implementation
- Exit signal: task is complete when all Phase 1-4 items are checked off