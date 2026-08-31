# DhanAdhyaksh — TRD

**Version:** 1.0
**Status:** Draft
**Related:** PRD.md

## 1. Stack

```text
Frontend    React + TypeScript + Vite
Styling     Tailwind CSS
Backend     Node.js + Express
Database    PostgreSQL
ORM         Prisma
API         REST
Testing     Vitest + Supertest
Versioning  Git
```

---

## 2. Architecture

```text
React
  ↓
REST API
  ↓
Express / Node.js
  ↓
Prisma
  ↓
PostgreSQL
```

Frontend must never connect directly to PostgreSQL.

---

## 3. Core Entities

```text
Account
Category
Transaction
Transfer
Goal
GoalAllocation
```

Detailed structure will be defined in `SCHEMA.md`.

---

## 4. Money Handling

Never use floating-point values for money.

Store amounts as integer **paise**.

```text
₹100     → 10000
₹99.50   → 9950
```

Use `BIGINT`/integer-based representation in PostgreSQL.

---

## 5. Balance

Transactions are the source of truth.

```text
Balance =
Initial Balance
+ Income
- Expenses
+ Transfers In
- Transfers Out
```

Cached balances may be introduced later, but must always be recoverable from transaction data.

---

## 6. Financial Rules

* Amounts must be positive.
* Expenses cannot exceed available money.
* Transfers cannot use the same source and destination.
* Transfers do not change total cash.
* Multi-step financial operations must be atomic.
* Editing/deleting transactions must correctly update their financial effect.

---

## 7. Security

* Authentication required for private data.
* Users can access only their own records.
* Passwords must never be stored as plaintext.
* Secrets belong in environment variables.
* `.env` must not be committed.
* Backend validates all financial operations.
* Never expose database credentials to frontend.

---

## 8. API

Main endpoints:

```text
/api/auth
/api/accounts
/api/transactions
/api/transfers
/api/categories
/api/goals
```

Use consistent JSON responses and meaningful error codes.

---

## 9. Code Structure

Prefer:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Prisma
  ↓
Database
```

Keep business logic out of UI components and route handlers.

Avoid unnecessary abstractions.

---

## 10. Testing

Test critical financial logic:

* Income
* Expense
* Transfer
* Insufficient balance
* Editing transactions
* Deleting transactions
* Account ownership
* Goal allocation

Financial correctness is more important than test quantity.

---

## 11. Development

All database changes must use version-controlled Prisma migrations.

Provide commands for:

```text
Install
Develop
Migrate
Seed
Test
Build
```

Use ESLint and TypeScript checking.

---

## 12. Future Compatibility

The architecture should leave room for:

* PWA
* Offline storage
* Sync
* Data export/import

These should not complicate the MVP.

---

## 13. Technical Principle

> **Build the simplest architecture that keeps financial data correct, secure and maintainable.**
