# DhanAdhyaksh — Rules

**Version:** 1.0
**Status:** Draft

## 1. General

* DhanAdhyaksh is a single-user personal cash tracker.
* Keep the application simple; do not add features without a reason.
* Mobile is the primary platform.
* Financial correctness is more important than UI polish.
* Do not introduce unnecessary libraries, services, or architecture.

---

## 2. Money

* Never use floating-point numbers for money.
* Store money as integer **paise**.
* Amounts must always be greater than `0`.
* Never silently round monetary values.
* Always display money in ₹ format in the UI.

---

## 3. Accounts

* An account represents a physical place where cash is kept.
* Examples: Wallet, Room, Bag.
* Account balance is derived from its financial activity.
* Never directly modify a balance to "fix" a transaction.
* Prefer archiving accounts over deleting accounts with history.

---

## 4. Transactions

### Income

```text
Account balance ↑
Total cash ↑
```

### Expense

```text
Account balance ↓
Total cash ↓
```

### Transfer

```text
Source account ↓
Destination account ↑
Total cash unchanged
```

* Expenses cannot exceed available money.
* Every transaction must have a date.
* Expenses should have a category.
* Notes are optional.

---

## 5. Editing & Deleting

* Editing a transaction must correctly apply the difference from the old transaction.
* Deleting a transaction must reverse its financial effect.
* Editing/deleting a transfer must correctly update both accounts.
* Financial operations involving multiple changes must be atomic.
* Never leave the database in a partially updated state.

---

## 6. Goals

* Goal money is still physically part of an account.
* Goal allocation only marks money as **reserved**.
* Reserved money is not counted as available spending money.
* Moving money into or out of a goal must not create or destroy cash.

```text
Total Cash
    ↓
Available + Reserved
```

---

## 7. Database

* PostgreSQL is the source database.
* Prisma is used for database access.
* Database changes must use migrations.
* Use foreign keys for relationships.
* Do not duplicate financial data unnecessarily.
* Transactions and transfers are the financial history/source of truth.

---

## 8. Backend

* Frontend never connects directly to PostgreSQL.
* Validate all input on the backend.
* Never trust frontend validation alone.
* Business logic belongs in the backend service layer.
* Return consistent API responses.
* Never expose database errors or secrets to the client.

---

## 9. Frontend

* Keep components small and reusable.
* Keep business logic out of UI components where possible.
* Always handle loading, empty and error states.
* Prevent duplicate submissions.
* Optimize common actions for mobile.
* Avoid unnecessary animations and complexity.

---

## 10. Security

* Never store passwords as plaintext.
* Never commit secrets or `.env`.
* Validate ownership before accessing financial records.
* Never expose database credentials to the frontend.
* Use established security libraries instead of custom cryptography.

---

## 11. Code Quality

* Use TypeScript.
* Avoid `any` unless necessary.
* Use meaningful names.
* Avoid duplicated logic.
* Remove unused code and dependencies.
* Prefer simple solutions over clever ones.

---

## 12. Before Adding a Feature

Ask:

```text
Does it solve a real problem?
        ↓
Does it fit DhanAdhyaksh's purpose?
        ↓
Can it be implemented simply?
        ↓
Will it affect financial correctness?
```

If the feature adds complexity without meaningful value, don't add it.

---

## 13. Core Principle

> **DhanAdhyaksh should remain a simple, reliable cash tracker—not become an accounting system.**
