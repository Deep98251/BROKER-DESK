# BrokerDesk — Transport Broker Management (PRD)

## Problem Statement (original)
> can i create a transport software where i can manage all my data for free here??
> I am a broker for transporter and party i deal in trucks. I NEED ALL BUT ALSO INCLUDE commission tab section as my revenue source is commission only. Single user. i need a very attractive clean and simple, it shouldnt be too complicated to work. yes i would need pdf.

## User Persona
- **Solo transport broker (India)** — connects transporters (truck owners) with parties (consignors). Revenue = commission per trip. Needs simple end-to-end record-keeping and printable bills.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). All routes prefixed `/api`. UUID string IDs. Datetime stored as ISO strings.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn UI + recharts + sonner + lucide-react. Uses `REACT_APP_BACKEND_URL`.
- **Design**: "Organic & Earthy" — Bone White `#F9F9F8` background, Terracotta `#D95E36` accent, Manrope headings, IBM Plex Sans body. Fixed left sidebar + main content.
- **No auth** — single-user local workspace.
- **PDF**: Native browser print via `window.print()` on `/invoice/:id` route (opens in new tab).

## Core Requirements (static)
1. Modules: Trucks, Drivers, Parties (transporter + consignor tabs), Trips/Loads, Commission (hero), Expenses, Dashboard.
2. Trip must auto-calculate commission from freight × commission%.
3. Commission tab must be visually distinctive (revenue centerpiece).
4. Every trip must be exportable as a printable PDF bill.

## Implemented (Feb 2026 — v1)
- Full CRUD for trucks, drivers, parties (with type filter), trips, expenses
- `/api/stats/summary` with 6-month rolling commission buckets
- Dashboard with 4 stat cards, commission trend area chart, directory, recent trips table
- Commission page: hero card (Total/Received/Pending), monthly bar chart, pending → received flow with one-click mark
- Trips: search + status filter, auto-computed commission (client + server), advance/balance tracking
- Invoice PDF: full A4-style printable bill with route, financials, brokerage highlighted
- Empty states, sonner toasts, data-testid coverage across all interactive elements

## Testing (iteration_1.json)
- Backend: 100% pass — all CRUD + stats endpoints verified
- Frontend: 100% pass — end-to-end flow (add trip → commission appears → mark received → invoice PDF) verified

## Backlog (P1/P2)
- P1: Global search across trips/parties, CSV export
- P1: Payment history log per trip (partial settlements)
- P2: Multi-user + auth (Emergent Google) if user grows team
- P2: WhatsApp share of invoice PDF link
- P2: GST/tax breakup in invoice for registered brokers
- P2: Ledger view per party (aggregated commission owed)
- P2: Trip-linked expenses roll-up under each trip

## Next Actions
- Await user feedback on 1st drop
- On request: add CSV export, per-party ledger, or GST tax lines to invoices

## Iteration 3 — Multi-firm support (Feb 2026)
- Added `Firm` entity + full CRUD (`/api/firms`)
- Auto-seed **DEEP LOGISTICS** and **SHEETAL TRANSPORT CO** on first backend start
- `Trip` and `Expense` now carry `firm_id` + `firm_name`
- `/api/trips`, `/api/expenses`, `/api/stats/summary` accept optional `?firm_id=` filter
- Frontend: `FirmProvider` context (persists selection in localStorage), sidebar `FirmSwitcher`, `/firms` management page
- Trip / Expense forms include a Firm dropdown, prefilled from the active switcher selection
- Invoice PDF dynamically renders the trip's firm as the letterhead (name, address, GST, phone, email, tagline, bank details, signature block)
- Trips table shows a "Firm" column when All Firms is selected (hidden when a specific firm is active)
- All 3rd iteration tests passed 100% (backend 8/8, frontend all critical flows)

## Backlog additions
- P1: Per-firm PnL report (commission − expenses)
- P2: Firm-wise invoice numbering series (e.g., DL-001, ST-001)
- P2: Firm logo upload for letterhead

## Iteration 4 — Per-Party Ledger (Feb 2026)
- New collection `party_payments` — standalone payments/adjustments not tied to any trip (for opening balances, direct receipts, cash adjustments)
- New endpoint `GET /api/parties/{id}/ledger?firm_id=` — chronological ledger combining trip freight lines + trip payments + standalone party payments with running Debit/Credit/Balance
- New route `/parties/:id/ledger` with 3 KPI cards (Total Debit, Total Credit, Net Receivable/Payable) and a full ledger table
- "View Ledger" action on Parties page + party name is now a clickable link
- Quick-Receipt (consignor) / Quick-Payment (transporter) shortcut for one-click entry
- Trip-linked ledger rows are clickable → open the invoice PDF in new tab
- Backend 26/26 tests pass, frontend 100% pass on all critical flows

## Backlog additions
- P1: Party ledger PDF export (currently uses window.print — works but not styled for A4 print sheet)
- P2: Party ledger date-range filter (financial year picker)
- P2: Overall receivables/payables dashboard aggregating balances across all parties
- P2: WhatsApp share of ledger PDF
