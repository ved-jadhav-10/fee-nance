# Manual QA Checklist (Phase 8)

Use this checklist after running:

```bash
npm run seed
npm run dev
```

Demo users:
- alex@feenance.demo / Demo@1234
- riya@feenance.demo / Demo@1234
- kabir@feenance.demo / Demo@1234

## 1. Auth Flows
- [ ] Register with email/password creates user and redirects to dashboard
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Continue with Google appears only when Google env vars are configured
- [ ] Sign out ends session and redirects to login
- [ ] Visiting `/dashboard` while logged out redirects to `/login`

## 2. Personal Finance Flows
- [ ] Transactions load with seeded records for demo users
- [ ] Create transaction works for both income and expense
- [ ] Update transaction title/amount works
- [ ] Delete transaction removes row from list
- [ ] Budget create/update/delete works
- [ ] Category create/update/delete works for custom categories
- [ ] Date filters update summaries and list content
- [ ] Running balance updates after transaction changes
- [ ] Monthly summary and category summary are visible and non-empty with seed data

## 3. Recurring Rules
- [ ] Recurring transactions can be created
- [ ] Dashboard `Run Recurring` button triggers generation and refreshes data

## 4. Group Expense Flows
- [ ] Group list loads seeded groups (`Weekend Crew`, `Flatmates 302`)
- [ ] Create group works and shows invite code
- [ ] Join group with valid invite code works
- [ ] Add group expense works for:
  - [ ] Equal split
  - [ ] Custom split
  - [ ] Percentage split
- [ ] Multiple payer entries are accepted and validated
- [ ] Invalid split totals are rejected with 422 response
- [ ] Balances panel shows net per member and pairwise settlements
- [ ] Manual settlement creates a settlement record and updates balances

## 5. API Security and Validation
- [ ] Requests to `/api/private/*` without session return 401
- [ ] Invalid payloads return structured 422 errors
- [ ] Unauthorized group access returns 403
- [ ] Invalid ObjectId paths return 422

## 6. UI and Responsiveness
- [ ] Dashboard, Finance, Groups, and Group Detail pages render at mobile width (360px)
- [ ] No clipped controls/buttons in forms
- [ ] Select dropdowns remain readable in dark mode
- [ ] Error boundary pages render usable retry actions

## 7. Seed Data Verification
- [ ] `npm run seed` finishes without errors
- [ ] Three demo users are present
- [ ] Seeded transactions exist across multiple months
- [ ] Seeded budgets exist across monthly/quarterly/yearly cycles
- [ ] Seeded groups include expenses and settlements

## 8. Final Regression Sweep
- [ ] `npm run lint` passes
- [ ] Critical pages return 200 (`/`, `/login`, `/register`)
- [ ] No server-side unhandled errors in terminal during smoke test
