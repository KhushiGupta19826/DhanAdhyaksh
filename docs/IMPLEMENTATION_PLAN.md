# Dhanadhyaksh — Implementation Plan

## 1. Project Setup

Set up the development environment and project structure.

### Tasks

* Initialize React + TypeScript + Vite frontend
* Initialize Node.js + Express + TypeScript backend
* Configure Tailwind CSS
* Configure environment variables
* Configure ESLint/formatting
* Set up Git and `.gitignore`
* Create basic frontend/backend health checks

### Milestone

Frontend and backend run independently and communicate successfully.

---

## 2. PostgreSQL + Prisma

Connect the backend to PostgreSQL through Prisma.

### Tasks

* Create PostgreSQL database
* Install and configure Prisma
* Configure `DATABASE_URL`
* Initialize Prisma
* Establish database connection
* Create initial migration setup

### Milestone

Backend can successfully connect to PostgreSQL through Prisma.

---

## 3. Database Schema + Migrations

Implement the approved Dhanadhyaksh schema.

### Entities

```text
Account
Category
Transaction
Transfer
Goal
GoalAllocation
```

### Tasks

* Define Prisma models
* Use BIGINT/integer paise for monetary values
* Add relationships and foreign keys
* Add required constraints
* Add indexes where useful
* Create and run initial migration
* Seed default expense categories

### Milestone

Database schema is created and Prisma can read/write records correctly.

---

## 4. Backend/API Foundation

Create the basic Express backend structure.

### Structure

```text
backend/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── utils/
│   └── app.ts
```

### Tasks

* Configure Express
* Configure Prisma client
* Add request validation
* Add centralized error handling
* Add API response/error conventions
* Add health endpoint
* Keep financial/business logic inside services

### Milestone

A clean API foundation is ready for financial features.

---

## 5. Accounts

Implement account management.

### Tasks

* Create account
* List accounts
* View account
* Update account
* Archive/deactivate account
* Calculate account balance

### Balance

```text
initial_balance
+ income
- expenses
+ transfers_in
- transfers_out
```

### Milestone

Accounts can be created and their balances are calculated correctly.

---

## 6. Transactions

Implement receiving and spending money.

### Receive Money

```text
Amount
Source
Account
Date
Note
```

### Spend Money

```text
Amount
Category
Account
Date
Note
```

### Tasks

* Create income
* Create expense
* Validate sufficient available balance
* Calculate balances from financial records
* Edit transactions
* Delete transactions
* Validate all operations on the backend

### Milestone

The core flow works:

```text
Create Account
      ↓
Receive ₹2,000
      ↓
Balance = ₹2,000
      ↓
Spend ₹500
      ↓
Balance = ₹1,500
```

This is the **first major reliability milestone**.

---

## 7. Transfers

Implement movement of existing cash between accounts.

### Tasks

* Create transfer
* Validate source and destination
* Prevent same-account transfers
* Validate sufficient available balance
* Update both account balances through transfer records
* Edit transfers
* Delete transfers
* Use database transactions for atomicity

### Milestone

```text
Wallet ₹2,000
Room   ₹0

Wallet → Room ₹500

Wallet ₹1,500
Room   ₹500
Total  ₹2,000
```

Total cash remains unchanged.

---

## 8. Dashboard

Build the main Dhanadhyaksh dashboard.

### Display

```text
Total Cash
Available Cash
Reserved Cash
Account Balances
Recent Transactions
```

### Quick Actions

```text
+ Receive
- Spend
↔ Transfer
```

### Milestone

Opening Dhanadhyaksh immediately shows the current financial state and allows quick recording of money movement.

---

## 9. Transaction History

Implement transaction and transfer history.

### Tasks

* List transactions
* Display transaction details
* Search
* Filter by type
* Filter by account
* Filter by category
* Filter by date
* Edit
* Delete
* Add loading/empty/error states

### Milestone

Past financial activity can be easily found and corrected.

---

## 10. Goals

Implement reserved cash for future goals.

### Tasks

* Create goal
* Set target amount
* Set optional target date
* Allocate existing money
* Remove allocation
* Display reserved amount
* Display remaining amount
* Prevent allocation beyond available cash
* Mark goals completed

### Milestone

```text
Wallet = ₹5,000

Headphones
Target   = ₹5,000
Reserved = ₹1,500
```

The ₹1,500 remains part of the physical Wallet balance but is unavailable for normal spending.

---

## 11. Testing + Polish

Verify financial correctness before final UI polish.

### Backend Tests

Test:

* Account creation
* Income
* Expense
* Insufficient balance
* Transaction editing
* Transaction deletion
* Transfers
* Transfer editing
* Transfer deletion
* Goal allocations
* Invalid amounts
* Atomic operations

### Frontend Tests

Test:

* Forms
* Validation
* Loading states
* Empty states
* Error states
* Duplicate submission prevention
* Dashboard updates

### Final Polish

* Mobile-first responsive UI
* Desktop layout
* Consistent spacing and typography
* Accessible controls
* Fast expense-entry flow
* Confirm destructive actions
* Remove unnecessary complexity

### Milestone

Dhanadhyaksh is reliable enough for everyday personal use.

---

# Development Order

The implementation should proceed incrementally:

```text
Project Setup
     ↓
PostgreSQL + Prisma
     ↓
Schema + Migrations
     ↓
Backend Foundation
     ↓
Accounts
     ↓
Transactions
     ↓
Transfers
     ↓
Dashboard
     ↓
History
     ↓
Goals
     ↓
Testing + Polish
```

## First Working Version

Prioritize this flow above everything else:

```text
Create Account
      ↓
Receive Money
      ↓
See Balance
      ↓
Spend Money
      ↓
See Updated Balance
```

Only move to the next major feature after the current feature works correctly.

---

# Implementation Principles

* Financial correctness comes before UI polish.
* Keep business logic in backend services.
* Never use floating-point values for money.
* Store money as paise.
* Never manually alter balances to compensate for incorrect transactions.
* Use database transactions for multi-step financial operations.
* Keep the frontend independent from PostgreSQL.
* Avoid unnecessary abstractions and dependencies.
* Do not introduce users/authentication unless the product requirements change.
* Build and test one feature at a time.

> **Correct money is more important than clever code.**
