# Architecture Diagram and Module Flow

## 1. High-Level Architecture

```mermaid
flowchart TB
  U[User Browser] --> N[Next.js App Router]

  subgraph NextApp[Fee-Nance Next.js Application]
    PAGES[App Pages\n/login /register /dashboard /finance /groups]
    API[Private APIs\n/api/private/*]
    AUTH[NextAuth\nCredentials + Google OAuth]
    VAL[Zod Validation + DTOs]
    LOG[Logger + Error Boundaries]
    CORE[Business Logic\nSplit, Balances, Reporting]
  end

  N --> PAGES
  N --> API
  N --> AUTH
  API --> VAL
  API --> CORE
  API --> LOG
  AUTH --> DB
  API --> DB

  DB[(MongoDB Atlas\nMongoose Models)]
  DB --> IDX[Indexes + Constraints\nIdempotency key unique index]
```

## 2. Module Flow (Request Lifecycle)

```mermaid
flowchart LR
  A[Client Action\nCreate Expense / Add Transaction / Settle] --> B[Protected Route/API]
  B --> C[Auth Guard\nrequireUserId]
  C --> D[Input Parsing\nZod schema]
  D --> E[Authorization\nMembership / Ownership checks]
  E --> F[Business Rules\nTotals, split logic, idempotency]
  F --> G[Mongoose DB Operation]
  G --> H[Aggregation/Transformation]
  H --> I[JSON Response]
  I --> J[UI Refresh]

  E --> K[Error Handling]
  D --> K
  F --> K
  G --> K
  K --> L[Structured Error Response + Logger]
```

## 3. Core Runtime Modules

- Authentication and sessions: `src/lib/auth.ts`, `middleware.ts`
- Data access and connection: `src/lib/db.ts`, `src/models/*.ts`
- Validation and HTTP helpers: `src/lib/http.ts`, route DTOs
- Personal finance APIs: `src/app/api/private/transactions`, `budgets`, `categories`, `finance/aggregate`
- Group expense APIs: `src/app/api/private/groups/**`
- Split and balance logic: `src/lib/split.ts`, group balance routes
- Reporting for DBMS mapping: `src/lib/dbms-reporting.ts`, `src/scripts/dbms-report.ts`
