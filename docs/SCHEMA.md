# DhanAdhyaksh — Database Schema

**Version:** 1.0
**Status:** Draft

## 1. Database

**PostgreSQL**

DhanAdhyaksh is a single-user application, so there is no `users` table or authentication-related data in the MVP.

---

# 2. Entity Overview

```text
Account
   │
   ├──────────────┐
   │              │
   ▼              ▼
Transaction     Goal
   │
   ▼
Category
```

Core tables:

```text
accounts
categories
transactions
goals
goal_allocations
```

---

# 3. accounts

Represents where physical cash is kept.

Examples:

```text
Wallet
Room
Bag
Emergency Cash
```

### Columns

| Column          | Type      | Notes           |
| --------------- | --------- | --------------- |
| id              | BIGSERIAL | Primary key     |
| name            | VARCHAR   | Account name    |
| initial_balance | BIGINT    | Amount in paise |
| is_active       | BOOLEAN   | Default true    |
| created_at      | TIMESTAMP | Creation time   |
| updated_at      | TIMESTAMP | Last update     |

Example:

```text
id: 1
name: Wallet
initial_balance: 250000
```

`250000` = ₹2,500.

---

# 4. categories

Used for expenses.

### Columns

| Column     | Type      | Notes         |
| ---------- | --------- | ------------- |
| id         | BIGSERIAL | Primary key   |
| name       | VARCHAR   | Category name |
| created_at | TIMESTAMP | Creation time |

Initial categories can include:

```text
Food
Travel
Shopping
College
Hostel
Entertainment
Personal
Gifts
Miscellaneous
```

---

# 5. transactions

The main financial ledger.

A transaction represents money entering or leaving an account.

### Columns

| Column           | Type      | Notes                     |
| ---------------- | --------- | ------------------------- |
| id               | BIGSERIAL | Primary key               |
| account_id       | BIGINT    | FK → accounts             |
| category_id      | BIGINT    | FK → categories, nullable |
| type             | ENUM      | INCOME / EXPENSE          |
| amount           | BIGINT    | Amount in paise           |
| source           | VARCHAR   | For income                |
| note             | TEXT      | Optional                  |
| transaction_date | DATE      | Date of transaction       |
| created_at       | TIMESTAMP | Creation time             |
| updated_at       | TIMESTAMP | Last update               |

Examples:

```text
Income:
₹2,000 → Wallet

Expense:
₹120 → Food → Wallet
```

---

# 6. transfers

Transfers need their own table because they involve **two accounts**.

### Columns

| Column          | Type      | Notes            |
| --------------- | --------- | ---------------- |
| id              | BIGSERIAL | Primary key      |
| from_account_id | BIGINT    | FK → accounts    |
| to_account_id   | BIGINT    | FK → accounts    |
| amount          | BIGINT    | Amount in paise  |
| note            | TEXT      | Optional         |
| transfer_date   | DATE      | Date of transfer |
| created_at      | TIMESTAMP | Creation time    |
| updated_at      | TIMESTAMP | Last update      |

Example:

```text
Wallet → Room
₹500
```

This decreases Wallet by ₹500 and increases Room by ₹500.

---

# 7. goals

Goals represent money the user wants to reserve.

Examples:

```text
New Headphones
Trip
Emergency Fund
```

### Columns

| Column        | Type      | Notes           |
| ------------- | --------- | --------------- |
| id            | BIGSERIAL | Primary key     |
| name          | VARCHAR   | Goal name       |
| target_amount | BIGINT    | Target in paise |
| target_date   | DATE      | Nullable        |
| is_completed  | BOOLEAN   | Default false   |
| created_at    | TIMESTAMP | Creation time   |
| updated_at    | TIMESTAMP | Last update     |

---

# 8. goal_allocations

Tracks money reserved for goals.

### Columns

| Column     | Type      | Notes           |
| ---------- | --------- | --------------- |
| id         | BIGSERIAL | Primary key     |
| goal_id    | BIGINT    | FK → goals      |
| account_id | BIGINT    | FK → accounts   |
| amount     | BIGINT    | Amount in paise |
| created_at | TIMESTAMP | Creation time   |

Example:

```text
Wallet
₹5,000

Goal:
Headphones
₹1,500 reserved
```

The ₹1,500 still physically exists in the Wallet.

It is simply classified as **reserved**.

---

# 9. Relationships

```text
accounts
   │
   ├───────────────< transactions
   │
   ├───────────────< transfers (from)
   │
   ├───────────────< transfers (to)
   │
   └───────────────< goal_allocations >──────── goals

categories
   │
   └───────────────< transactions
```

---

# 10. Balance Calculation

Account balance:

```text
initial_balance
+ income
- expenses
+ transfers_in
- transfers_out
```

Available balance:

```text
balance - reserved_goal_money
```

Total cash:

```text
sum of all account balances
```

---

# 11. Important Constraints

### Amount

All monetary amounts must be:

```text
> 0
```

and stored in **paise**, not floating point.

### Transfer

```text
from_account_id != to_account_id
```

### Foreign Keys

Transactions, transfers and goal allocations must reference existing accounts.

### Deletion

Financial records should not be casually hard-deleted if doing so would make historical balances difficult to understand.

Prefer archiving accounts where appropriate.

---

# 12. Example Data

### Accounts

```text
Wallet          ₹2,500
Room            ₹1,500
Bag             ₹500
```

### Transactions

```text
+ ₹3,000   DhanAdhyaksh Money   → Wallet
- ₹120     Food           → Wallet
- ₹380     Shopping       → Wallet
```

### Transfer

```text
Wallet → Room
₹500
```

### Goal

```text
Headphones
Target: ₹5,000
Reserved: ₹1,000
```

---

# 13. Source of Truth

The transaction and transfer records are the financial history.

Balances should be derivable from this history.

If a cached balance is introduced later for performance, it must always be possible to recalculate it from the underlying records.

---

# 14. Future Expansion

The schema can later be extended with:

```text
Recurring transactions
Cash reconciliation
Attachments
Budgets
Monthly summaries
Offline sync
```

No multi-user structure is required unless DhanAdhyaksh is eventually turned into a shared application.

---

# 15. Schema Principle

> **Keep the database small, relational and financially consistent.**
