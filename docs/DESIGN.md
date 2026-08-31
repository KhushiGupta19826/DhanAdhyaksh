# DhanAdhyaksh — Design

**Version:** 1.0
**Status:** Draft

## 1. Design Direction

DhanAdhyaksh should feel:

* Personal
* Clean
* Calm
* Minimal
* Modern
* Easy to use

It should feel more like a **personal utility app** than a banking application.

Avoid:

* Excessive cards
* Heavy gradients
* Excessive animations
* Cluttered dashboards
* Corporate-looking UI

---

## 2. Design Priority

Information hierarchy:

```text id="8j8p2d"
1. Total money
2. Available / Reserved
3. Accounts
4. Quick actions
5. Recent transactions
6. Analytics
```

The user should understand their financial state within a few seconds of opening DhanAdhyaksh.

---

## 3. Layout

### Mobile

Primary layout:

```text id="w3y4xk"
┌─────────────────────┐
│       Header        │
├─────────────────────┤
│                     │
│      Content        │
│                     │
│                     │
├─────────────────────┤
│ Home │ History │ ...│
└─────────────────────┘
```

Use bottom navigation.

### Desktop

Use a wider layout with:

```text id="i6d8hc"
┌──────────┬────────────────────┐
│ Sidebar  │     Content        │
│          │                    │
│ Home     │                    │
│ History  │                    │
│ Goals    │                    │
│ More     │                    │
└──────────┴────────────────────┘
```

Desktop should not feel like a stretched mobile screen.

---

## 4. Dashboard

The dashboard should contain:

```text id="0g3g1v"
Total Balance
      ↓
Available / Reserved
      ↓
Quick Actions
      ↓
Accounts
      ↓
Recent Transactions
      ↓
Monthly Summary
```

The balance should be the visual focal point.

---

## 5. Quick Actions

Primary actions:

```text id="d8e7w1"
+ Receive
- Spend
↔ Transfer
```

These should be highly accessible.

The most common action—recording an expense—should require minimal interaction.

---

## 6. Transactions

Income, expenses and transfers should be visually distinguishable through:

* Icon
* Label
* Amount
* Account
* Date

Example:

```text id="lq7r2v"
🍔  Food
    Wallet
                 - ₹120

💰  DhanAdhyaksh Money
    Wallet
               + ₹2,000
```

Avoid relying only on color to distinguish transaction types.

---

## 7. Forms

Transaction forms should be short.

### Expense

```text id="h4l9v3"
Amount
Category
Account
Date
Note
```

### Income

```text id="9s2kec"
Amount
Source
Account
Date
Note
```

### Transfer

```text id="2w7p1q"
From
To
Amount
Date
Note
```

Use sensible defaults where possible, such as today's date and the last-used account.

---

## 8. Navigation

Mobile:

```text id="g7xq2d"
Home | History | Goals | More
```

Desktop:

```text id="r2o8nq"
Sidebar:
Home
History
Goals
Accounts
Categories
Settings
```

Primary transaction actions should remain easily accessible from the dashboard.

---

## 9. Components

Create reusable components for commonly repeated UI:

```text id="5w8s1r"
Button
Input
Modal
Card
TransactionItem
AccountCard
BalanceDisplay
CategorySelector
DatePicker
EmptyState
LoadingState
ErrorState
```

Don't create abstractions for one-off elements without a clear reason.

---

## 10. Colors

Use a restrained color palette.

The interface should have:

* One primary accent
* Neutral background
* Neutral text
* A positive state for income/success
* A negative state for expenses/errors
* A warning state

Do not use color as the only indicator of meaning.

The exact palette can be refined during implementation.

---

## 11. Typography

Use a clean, highly readable sans-serif font.

Prioritize:

```text id="x4t8p6"
Large → Balance
Medium → Section headings
Normal → Transactions
Small → Supporting information
```

Numbers representing money should be visually prominent and easy to scan.

---

## 12. Responsive Behavior

The application must work comfortably across:

```text id="2qk6nx"
Small phones
Large phones
Tablets
Laptops
Desktop screens
```

Mobile is the primary design target.

Touch targets should be comfortable for finger interaction.

---

## 13. States

Every important screen should account for:

```text id="f1m3r8"
Loading
Empty
Success
Error
```

Examples:

```text id="z9j1qs"
No transactions yet.
Record your first expense to get started.
```

Errors should explain what happened and what the user can do.

---

## 14. Modals & Confirmations

Use confirmations only when necessary.

Require confirmation for:

* Deleting transactions
* Deleting/archiving accounts
* Other destructive actions

Do not require confirmation for normal income, expense or transfer entries.

---

## 15. Accessibility

Use:

* Semantic HTML
* Accessible labels
* Keyboard navigation
* Visible focus states
* Good contrast
* Adequate touch targets

Never communicate important information through color alone.

---

## 16. Design Principle

> **DhanAdhyaksh should make recording money feel effortless, not like doing accounting.**
