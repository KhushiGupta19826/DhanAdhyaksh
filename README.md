# DhanAdhyaksh (धनअध्यक्ष)

A private, personal physical-cash tracking application.

> **"How much money do I have, where is it, where did it come from, and where did it go?"**

DhanAdhyaksh is a single-user personal utility built specifically for physical cash. It is **not** a multi-user app, banking platform, or accounting system. It does not introduce authentication, roles, or multi-tenant overhead.

---

## 🏛️ Architecture

```text
React + TypeScript (Vite + Tailwind CSS)
                   ↓
                REST API
                   ↓
       Express + Node.js + TypeScript
                   ↓
                 Prisma
                   ↓
               PostgreSQL
```

> **Rule:** The frontend never connects directly to PostgreSQL.

---

## 💰 The Cardinal Money Rule

> **Never use floating-point numbers for monetary values.**

All monetary amounts are strictly represented and stored as **integer paise** (1 Rupee = 100 paise):

| Display Value | Internal Value (Paise) |
|---------------|------------------------|
| ₹1.00         | `100`                  |
| ₹99.50        | `9950`                 |
| ₹2,500.00     | `250000`               |

---

## 📁 Project Structure

```text
Dhanadhyaksh/
│
├── frontend/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Screen views (Mobile-first)
│   │   ├── services/             # API client & services
│   │   ├── hooks/                # Custom React hooks
│   │   ├── types/                # TypeScript definitions (Paise, etc.)
│   │   ├── utils/                # Utilities (Currency formatting, etc.)
│   │   ├── App.tsx               # App root component
│   │   └── main.tsx              # React entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                      # Node.js + Express + TypeScript + Prisma
│   ├── prisma/
│   │   └── schema.prisma         # Prisma schema & PostgreSQL datasource
│   ├── src/
│   │   ├── controllers/          # Request controllers
│   │   ├── routes/               # API routes
│   │   ├── services/             # Core business logic
│   │   ├── middleware/           # Centralized error handling & middleware
│   │   ├── utils/                # Prisma client singleton & helpers
│   │   ├── types/                # Type declarations & Paise definition
│   │   ├── app.ts                # Express app setup (export for tests)
│   │   └── server.ts             # HTTP server listener
│   ├── tests/                    # Vitest + Supertest test suites
│   ├── .env.example              # Environment variables template
│   ├── package.json
│   └── vitest.config.ts
│
├── docs/                         # Specifications & design documentation
│   ├── PRD.md                    # Product Requirements Document
│   ├── TRD.md                    # Technical Requirements Document
│   ├── APP_FLOW.md               # User & application interaction flow
│   ├── DESIGN.md                 # UI/UX design guidelines
│   ├── SCHEMA.md                 # Database schema specifications
│   ├── RULES.md                  # Project & financial rules
│   └── IMPLEMENTATION_PLAN.md    # Multi-phase roadmap
│
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart & Commands

### Prerequisites
- **Node.js**: v18+ (tested on v22)
- **npm**: v9+ (tested on v10)
- **PostgreSQL**: v14+ (for Phase 2 schema migrations)

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run development server (starts on http://localhost:5000)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server (starts on http://localhost:5173)
npm run dev

# Build for production
npm run build
```

---

## 📡 API Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Service health status and timestamp |

---

## 🗺️ Roadmap

- **Phase 1: Project Setup** ✅ (Foundation, structure, health API, Vitest)
- **Phase 2: Database Schema & Prisma** ⏳ (PostgreSQL schema, migrations, seed data)
- **Phase 3: Core API Services** (Accounts, Categories, Transactions, Transfers, Goals)
- **Phase 4: Mobile-First Frontend** (Dashboard, Money In/Out, Transfer, History)
