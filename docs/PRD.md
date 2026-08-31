# DhanAdhyaksh — PRD

**Version:** 1.0
**Status:** Draft

## 1. Overview

**DhanAdhyaksh** is a private, personal cash-tracking app for managing physical money.

It answers:

> **How much money do I have, where is it, where did it come from, and where did it go?**

It is designed primarily for mobile, with laptop support.

---

## 2. Problem

Traditional finance apps focus on UPI, cards and bank accounts.

DhanAdhyaksh focuses on **physical cash** and makes it easy to record money received, spent and moved between locations.

---

## 3. Core Features

### Dashboard

* Total cash
* Available cash
* Reserved cash
* Account balances
* Recent transactions
* Quick actions

### Money In

Record:

* Amount
* Source
* Account/location
* Date
* Optional note

### Money Out

Record:

* Amount
* Category
* Account/location
* Date
* Optional note

### Transfer

Move money between accounts.

Example:

```text
Wallet → Room
₹500
```

Total cash remains unchanged.

### Accounts

Physical locations such as:

```text
Wallet
Room
Bag
Emergency Cash
```

### History

* View transactions
* Search
* Filter
* Edit
* Delete

### Categories

Default categories + custom categories.

### Goals

Reserve money for things such as:

```text
Trip
Headphones
Emergency Fund
```

Reserved money remains part of total cash but isn't counted as available spending money.

---

## 4. MVP

### Must Have

* Authentication
* Dashboard
* Accounts
* Income
* Expenses
* Transfers
* Transaction history
* Categories
* Edit/delete transactions

### Nice to Have

* Goals
* Monthly summaries
* Search/filter
* Data export

### Future

* Offline support
* PWA
* Cash verification
* Recurring transactions
* Advanced analytics

---

## 5. Out of Scope

No:

* UPI integration
* Bank integration
* Card tracking
* Investments
* Cryptocurrency
* Loans
* Business accounting
* AI financial advisor
* Social/shared finance features

---

## 6. Product Principles

1. **Simple over feature-heavy**
2. **Mobile first**
3. **Fast transaction entry**
4. **Financial correctness over convenience**
5. **Track money, not complexity**

---

## 7. Success

DhanAdhyaksh succeeds if the user can quickly:

```
Open DhanAdhyaksh
→ See current money
→ Record money movement
→ Know where the money went
```
without relying on memory.
