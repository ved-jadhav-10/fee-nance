# Fee-Nance Implementation TODO

## Project Direction Confirmed
- Database: MongoDB only
- Build order: MVP first
- Requirement: Actual implementation required for DBMS mini-project
- DBMS strategy: MongoDB runtime + SQL scripts folder for documentation only
- Authentication: Email/password + Google OAuth
- Scope: Single account per user, multi-group membership
- Currency: INR only (for now)
- Budget cycles: Monthly, quarterly, yearly
- Recurring frequencies in MVP: Monthly and yearly only
- Recurring transactions: Included in MVP
- Filters: Custom date range required
- Group expenses: Equal, custom, and percentage splits + multiple payers
- Settlements: Manual only, with per-user net amount visibility
- Settlement display: Simplified pairwise balances
- UX direction: Dark luxury editorial with cinematic tech feel
- Mobile-first responsive implementation required
- Data layer choice: Mongoose

## Phase 0 - Scope and Constraints
- [ ] Capture exact faculty rubric and submission checklist
- [ ] List mandatory DBMS artifacts and proof format (screenshots, SQL scripts folder, demo)
- [ ] Define non-negotiable MVP scope boundaries
- [ ] Exclude post-MVP items from current build

## Phase 1 - Product and Tech Foundation
- [x] Initialize Next.js (TypeScript + App Router)
- [x] Set up UI styling system and reusable component structure
- [x] Integrate Mongoose data layer
- [x] Configure linting, formatting, and strict TypeScript rules
- [x] Create environment variable template and secrets policy
- [x] Add logging and error boundary strategy
- [x] Implement dark luxury editorial visual system (typography, palette, depth, motion)
- [x] Lock mobile-first breakpoints and interaction patterns

## Phase 2 - Data Modeling
- [x] Finalize core entities and attributes (User, Transaction, Category, Budget, Group, GroupExpense, Settlement, RecurringRule)
- [x] Define MongoDB collections and document shape
- [x] Design indexes for query performance
- [x] Create ER diagram for DBMS documentation
- [x] Create relational mapping document from ER model for academic deliverables
- [x] Normalize relational mapping to 3NF in documentation

## Phase 3 - Authentication and User Setup
- [x] Implement email/password auth (sign-up/login/logout)
- [x] Implement Google OAuth login
- [x] Add secure session management
- [x] Protect private routes and API endpoints
- [x] Add basic profile and preferences support

## Phase 4 - Personal Finance MVP
- [x] Transactions CRUD (income and expense)
- [x] Categories CRUD (system + custom categories)
- [x] Budgets CRUD (monthly, quarterly, yearly)
- [x] Recurring transaction rules and instance generation
- [x] Currency enforcement (INR)
- [x] Running balance calculation
- [x] Monthly summary aggregation
- [x] Category-wise summary aggregation
- [x] Custom date range filtering for lists and reports
- [x] Validation and error responses

## Phase 5 - Group Expense MVP
- [x] Group creation and membership management
- [x] Record shared expense in group
- [x] Split logic: equal split
- [x] Split logic: custom amount split
- [x] Split logic: percentage split
- [x] Support multiple payers per expense
- [x] Compute net owes/owed per member
- [x] Manual settlement entry and balance adjustment
- [x] Show per-person net amount to settle
- [x] Group ledger history view

## Phase 6 - API and Business Logic Hardening
- [x] Add DTO/schema validation for all APIs
- [x] Add authorization checks for group actions
- [x] Add idempotency safeguards for settlement operations
- [x] Add pagination/filter/sort support for transaction and group history
- [x] Keep APIs private and protected (no public/open endpoints)
- [x] Enforce split and payer amount totals to exactly match expense total

## Phase 7 - Frontend Screens (MVP)
- [x] Auth pages
- [x] Dashboard (income, expense, balance, monthly trend)
- [x] Transactions page (list, filter, create, edit, delete)
- [x] Categories and budgets page
- [x] Groups page (group list, balances, add expense, settle up)
- [x] Responsive behavior for mobile and desktop

## Phase 8 - Demo Data and QA
- [x] Seed script for realistic demo data
- [x] Add demo accounts and sample transactions
- [x] Manual QA checklist for all MVP flows

## Phase 9 - DBMS Deliverables (MongoDB-Compatible Strategy)
- [x] Build equivalent scripted operations for advanced logic in backend services
- [x] Create sql-scripts folder with documentation-only SQL files (DDL, DML, joins, subqueries, GROUP BY, HAVING)
- [x] Prepare documented query set mapping to DDL/DML and advanced query concepts
- [x] Produce reproducible outputs for joins/subquery-like reporting via aggregation pipelines
- [x] Document trigger/procedure/function/cursor equivalents as implemented logic flows
- [x] Prepare viva explanation notes for MongoDB vs relational concept mapping

## Phase 10 - Final Documentation and Submission
- [x] Complete README with setup, env, run instructions
- [x] Add architecture diagram and module flow
- [x] Add ER diagram and normalization notes
- [x] Add private API module reference
- [x] Add demo script with sample accounts and scenarios

## Suggested Build Sequence
1. Foundation setup
2. Auth
3. Personal finance MVP
4. Group expense MVP
5. Demo data + manual QA
6. DBMS mapping deliverables
