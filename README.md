# Fee-Nance

Fee-Nance is an advanced personal finance and group expense management web app focused on financial clarity, strong data integrity, and practical real-world workflows.

## Runtime Direction
- Runtime database: MongoDB with Mongoose
- DBMS deliverables: SQL scripts folder for documentation mapping
- Authentication: Email/password + Google OAuth
- Currency: INR
- Budget cycles: Monthly, quarterly, yearly
- Recurring transactions: Monthly and yearly
- Group splits: Equal, custom, percentage
- Settlements: Manual with simplified pairwise balances

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- NextAuth
- MongoDB Atlas + Mongoose
- Zod

## MVP Features Implemented
### Personal finance
- Category management (system + custom)
- Transaction create/list with date filtering
- Budget create/list with cycle support
- Income/expense summary and balance calculation

### Group expense management
- Group creation with invite code
- Join group via invite code
- Multi-payer group expense recording
- Split validation enforcing total equality
- Balance computation per member
- Simplified pairwise settlement suggestions
- Manual settlement entries

### Authentication and security
- NextAuth credentials login
- Google OAuth (enabled when credentials exist)
- Protected dashboard and private API routes

## Setup and Run

1. Install dependencies

```bash
npm install
```

2. Create local env file

```bash
cp .env.example .env
```

3. Fill required variables in `.env`
- `MONGODB_URI`
- `NEXTAUTH_URL` (usually `http://localhost:3000`)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

4. Seed realistic demo data

```bash
npm run seed
```

5. Run in development

```bash
npm run dev
```

6. Open app
- `http://localhost:3000`

## Scripts

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run start` - run production build
- `npm run lint` - lint codebase
- `npm run format` - auto-fix lint formatting issues
- `npm run seed` - seed realistic demo data
- `npm run dbms:report` - generate reproducible DBMS report output JSON

## Environment Variables

Required:
- `MONGODB_URI`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Optional:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `LOG_LEVEL`

## Documentation Index (Phase 10)

Architecture and flow:
- `docs/architecture-module-flow.md`

ER and normalization:
- `docs/er-diagram.md`
- `docs/relational-mapping.md`

Private API reference:
- `docs/private-api-reference.md`

Demo walkthrough script:
- `docs/demo-script.md`

QA checklist:
- `docs/manual-qa-checklist.md`

## Demo Seed Data

Run:

```bash
npm run seed
```

Generate DBMS reproducible report output:

```bash
npm run dbms:report
```

Demo accounts:
- alex@feenance.demo / Demo@1234
- riya@feenance.demo / Demo@1234
- kabir@feenance.demo / Demo@1234

## DBMS Deliverables

- `sql-scripts/` (DDL, DML, joins, subqueries, GROUP BY, HAVING, logic-flow equivalents)
- `docs/dbms-query-mapping.md`
- `docs/mongo-relational-equivalents.md`
- `docs/viva-notes-mongodb-vs-relational.md`
- `docs/dbms-report-output.json` (generated via `npm run dbms:report`)

## Main Routes
- / landing page
- /login sign in
- /register sign up
- /dashboard protected dashboard

## Notes
- Private APIs are under /api/private and are not publicly documented.
- sql-scripts contains documentation-only relational mapping SQL, not runtime migrations.
- Follow `docs/secrets-policy.md` for environment and secret handling practices.
