# Demo Script (Submission Walkthrough)

Use this script during project demo/viva.

## 0. Pre-demo Setup

Run:

```bash
npm install
npm run seed
npm run dev
```

Open: `http://localhost:3000`

Demo accounts:
- alex@feenance.demo / Demo@1234
- riya@feenance.demo / Demo@1234
- kabir@feenance.demo / Demo@1234

## 1. Authentication (2-3 mins)

1. Open `/login` and sign in as `alex@feenance.demo`.
2. Show protected behavior by logging out and revisiting `/dashboard` (redirect to `/login`).
3. Open `/register` and point out Google sign-in option (if env is configured).

## 2. Personal Finance Flow (4-5 mins)

1. Navigate to `/finance`.
2. Show seeded transactions and budgets loaded immediately.
3. Create one expense transaction (e.g., "Coffee", INR 180).
4. Edit and then delete that transaction.
5. Create one budget and then delete it.
6. Show monthly summary, category-wise summary, and running balance update.
7. Trigger recurring generation from dashboard (`Run Recurring`) and refresh summary.

## 3. Group Expense Flow (5-6 mins)

1. Navigate to `/groups` and open `Weekend Crew`.
2. Show existing members, expenses, balances, and settlements.
3. Add a new shared expense using custom or percentage split.
4. Highlight strict validations (payer/split totals must match expense total).
5. Record a manual settlement and show updated pairwise balances.

## 4. API/Validation and Security (2-3 mins)

1. Mention all `/api/private/*` routes are session-protected.
2. Show one invalid payload scenario causing structured `422` response.
3. Explain idempotency key support for settlement writes.

## 5. DBMS Mapping Deliverables (4-5 mins)

1. Show `docs/er-diagram.md`.
2. Show `docs/relational-mapping.md` (3NF mapping).
3. Show `sql-scripts/` folder with DDL/DML/joins/subqueries/GROUP BY/HAVING.
4. Run or show output of:

```bash
npm run dbms:report
```

5. Open `docs/dbms-report-output.json` to prove reproducible join/subquery/group reports.
6. Briefly explain trigger/procedure/function/cursor equivalents via:
   - `docs/mongo-relational-equivalents.md`

## 6. Closing Points (1 min)

- Runtime DB: MongoDB with Mongoose.
- Relational SQL included for academic DBMS mapping.
- Private-auth app with complete MVP flows and tested demo data.
