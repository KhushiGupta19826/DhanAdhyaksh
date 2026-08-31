# DhanAdhyaksh — App Flow

**Version:** 1.0

---

## 1. Overall Flow

```text
Login / Register
       ↓
   Dashboard
       ↓
 ┌─────┼─────────┐
 ↓     ↓         ↓
Receive Spend   Transfer
 ↓     ↓         ↓
 └─────┼─────────┘
       ↓
   Dashboard
```

---

## 2. Dashboard

The dashboard is the main screen and shows:

* Total cash
* Available cash
* Reserved cash
* Account balances
* Recent transactions
* Quick actions

Quick actions:

```text
+ Receive    - Spend    ↔ Transfer
```

---

## 3. Receive Money

```text
Dashboard
   ↓
Receive
   ↓
Amount + Source + Account + Date
   ↓
Optional Note
   ↓
Save
   ↓
Dashboard
```

Receiving money increases the selected account balance.

---

## 4. Spend Money

```text
Dashboard
   ↓
Spend
   ↓
Amount + Category + Account + Date
   ↓
Optional Note
   ↓
Validate Balance
   ↓
Save
   ↓
Dashboard
```

An expense cannot exceed the available balance of the selected account.

---

## 5. Transfer

```text
Dashboard
   ↓
Transfer
   ↓
From + To + Amount + Date
   ↓
Validate
   ↓
Save
   ↓
Dashboard
```

A transfer decreases the source account and increases the destination account.

**Total cash remains unchanged.**

---

## 6. History

```text
Dashboard
   ↓
History
   ↓
View Transactions
   ↓
Transaction Details
   ├── Edit
   └── Delete
```

History supports:

* Search
* Date filtering
* Account filtering
* Category filtering
* Transaction-type filtering

---

## 7. Accounts

```text
Dashboard
   ↓
Accounts
   ├── View account
   ├── Create account
   └── Edit account
```

Accounts represent physical locations such as:

```text
Wallet
Room
Bag
Emergency Cash
```

---

## 8. Goals

```text
Dashboard
   ↓
Goals
   ├── Create goal
   ├── Add money
   └── Release money
```

Goal money remains part of total cash but is marked as **reserved**.

---

## 9. Navigation

Mobile:

```text
Home | History | Goals | More
```

The primary transaction actions should always be easily accessible.

---

## 10. Important Rules

* Every financial action must update balances correctly.
* Transfers must not change total cash.
* Expenses cannot exceed available money.
* Editing/deleting transactions must correctly reverse their previous effect.
* The user should be able to record a normal expense in a few seconds.
* Mobile is the primary platform; desktop is secondary.

---

## 11. Future Flows

Not part of the initial MVP:

* Cash verification
* Offline mode
* PWA
* Recurring transactions
* Advanced analytics
* Data import/export
