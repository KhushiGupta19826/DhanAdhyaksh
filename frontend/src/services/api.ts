/**
 * Centralized API service with authentication support.
 * - Automatically attaches Authorization: Bearer <token> to all protected requests.
 * - Handles 401 responses by clearing the stored token (session expiry).
 * - Exposes setAuthToken / clearAuthToken for the AuthContext to call.
 */

export interface HealthResponse {
  status: string;
  message: string;
  app: string;
  uptime: number;
  timestamp: string;
}

export interface Account {
  id: number;
  name: string;
  initialBalance: number;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  categoryId: number | null;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  source: string | null;
  note: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  account?: Account | { id: number; name: string };
  category?: Category | { id: number; name: string } | null;
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note: string | null;
  transferDate: string;
  createdAt: string;
  updatedAt: string;
  fromAccount?: Account | { id: number; name: string };
  toAccount?: Account | { id: number; name: string };
}

export interface GoalAllocation {
  id: number;
  goalId: number;
  accountId: number;
  amount: number;
  createdAt: string;
  account?: { id: number; name: string };
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  isCompleted: boolean;
  allocatedAmount: number;
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
  allocations: GoalAllocation[];
}

export interface ApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
}

export interface MeResponse {
  authenticated: boolean;
  email: string;
}

// ── Token management ───────────────────────────────────────────────────────────
const TOKEN_KEY = 'dha_auth_token';

/** Called by AuthContext after successful login. */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Called by AuthContext on logout or 401. */
export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Reads the stored token (or null if not present). */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ── Session-expiry callback ────────────────────────────────────────────────────
// AuthContext registers itself here so the API layer can trigger a logout
// without a circular import.
let _onSessionExpired: (() => void) | null = null;

export function registerSessionExpiryHandler(handler: () => void): void {
  _onSessionExpired = handler;
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Shared fetch helper that injects auth headers and handles 401. */
async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    if (_onSessionExpired) {
      _onSessionExpired();
    }
  }

  return response;
}

// ── Auth API calls (no auth header needed) ─────────────────────────────────────

/**
 * POST /api/auth/login — authenticates the owner.
 * Does NOT use apiFetch to avoid circular token-clearing on deliberate login.
 */
export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const json: ApiResponse<LoginResponse> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || 'Invalid credentials');
  }

  return json.data;
}

/**
 * POST /api/auth/logout — server-side acknowledgment.
 */
export async function logoutApi(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
  clearAuthToken();
}

/**
 * GET /api/auth/me — verifies and restores session on page reload.
 * Throws if unauthenticated.
 */
export async function getMeApi(): Promise<MeResponse> {
  const response = await apiFetch('/auth/me');

  if (!response.ok) {
    throw new Error('Not authenticated');
  }

  const json: ApiResponse<MeResponse> = await response.json();
  return json.data;
}

// ── Health ─────────────────────────────────────────────────────────────────────

/**
 * Checks connectivity to the DhanAdhyaksh backend API.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API health check failed with status: ${response.status}`);
  }

  return response.json();
}

// ── Accounts ───────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const response = await apiFetch('/accounts');

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts (status ${response.status})`);
  }

  const json: ApiResponse<Account[]> = await response.json();
  return json.data;
}

export async function createAccount(data: {
  name: string;
  initialBalance?: number;
}): Promise<Account> {
  const response = await apiFetch('/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Account> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to create account (${response.status})`);
  }

  return json.data;
}

// ── Categories ─────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const response = await apiFetch('/categories');

  if (!response.ok) {
    throw new Error(`Failed to fetch categories (status ${response.status})`);
  }

  const json: ApiResponse<Category[]> = await response.json();
  return json.data;
}

// ── Transactions ───────────────────────────────────────────────────────────────

export async function createTransaction(data: {
  accountId: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  source?: string | null;
  categoryId?: number | null;
  note?: string | null;
  transactionDate: string;
}): Promise<Transaction> {
  const response = await apiFetch('/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transaction> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to create transaction (${response.status})`);
  }

  return json.data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiFetch('/transactions');

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions (status ${response.status})`);
  }

  const json: ApiResponse<Transaction[]> = await response.json();
  return json.data;
}

export async function updateTransaction(
  id: number,
  data: Partial<{
    accountId: number;
    categoryId: number | null;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    source: string | null;
    note: string | null;
    transactionDate: string;
  }>
): Promise<Transaction> {
  const response = await apiFetch(`/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transaction> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to update transaction (${response.status})`);
  }

  return json.data;
}

export async function deleteTransaction(id: number): Promise<void> {
  const response = await apiFetch(`/transactions/${id}`, {
    method: 'DELETE',
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to delete transaction (${response.status})`);
  }
}

// ── Transfers ──────────────────────────────────────────────────────────────────

export async function createTransfer(data: {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note?: string | null;
  transferDate: string;
}): Promise<Transfer> {
  const response = await apiFetch('/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transfer> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to create transfer (${response.status})`);
  }

  return json.data;
}

export async function getTransfers(): Promise<Transfer[]> {
  const response = await apiFetch('/transfers');

  if (!response.ok) {
    throw new Error(`Failed to fetch transfers (status ${response.status})`);
  }

  const json: ApiResponse<Transfer[]> = await response.json();
  return json.data;
}

export async function updateTransfer(
  id: number,
  data: Partial<{
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    note: string | null;
    transferDate: string;
  }>
): Promise<Transfer> {
  const response = await apiFetch(`/transfers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transfer> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to update transfer (${response.status})`);
  }

  return json.data;
}

export async function deleteTransfer(id: number): Promise<void> {
  const response = await apiFetch(`/transfers/${id}`, {
    method: 'DELETE',
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to delete transfer (${response.status})`);
  }
}

// ── Goals ──────────────────────────────────────────────────────────────────────

export async function getGoals(): Promise<Goal[]> {
  const response = await apiFetch('/goals');

  if (!response.ok) {
    throw new Error(`Failed to fetch goals (status ${response.status})`);
  }

  const json: ApiResponse<Goal[]> = await response.json();
  return json.data;
}

export async function getGoalById(id: number): Promise<Goal> {
  const response = await apiFetch(`/goals/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch goal (status ${response.status})`);
  }

  const json: ApiResponse<Goal> = await response.json();
  return json.data;
}

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
}): Promise<Goal> {
  const response = await apiFetch('/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to create goal (${response.status})`);
  }

  return json.data;
}

export async function updateGoal(
  id: number,
  data: Partial<{
    name: string;
    targetAmount: number;
    targetDate: string | null;
    isCompleted: boolean;
  }>
): Promise<Goal> {
  const response = await apiFetch(`/goals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to update goal (${response.status})`);
  }

  return json.data;
}

export async function deleteGoal(id: number): Promise<void> {
  const response = await apiFetch(`/goals/${id}`, {
    method: 'DELETE',
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to delete goal (${response.status})`);
  }
}

export async function allocateGoal(
  goalId: number,
  data: { accountId: number; amount: number }
): Promise<Goal> {
  const response = await apiFetch(`/goals/${goalId}/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to allocate cash (${response.status})`);
  }

  return json.data;
}

export async function updateGoalAllocation(
  goalId: number,
  allocationId: number,
  data: { amount: number }
): Promise<Goal> {
  const response = await apiFetch(`/goals/${goalId}/allocations/${allocationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to update allocation (${response.status})`);
  }

  return json.data;
}

export async function deleteGoalAllocation(
  goalId: number,
  allocationId: number
): Promise<Goal> {
  const response = await apiFetch(`/goals/${goalId}/allocations/${allocationId}`, {
    method: 'DELETE',
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to release allocation (${response.status})`);
  }

  return json.data;
}
