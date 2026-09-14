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

export interface ApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Checks connectivity to the DhanAdhyaksh backend API.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API health check failed with status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches active accounts list from GET /api/accounts
 */
export async function getAccounts(): Promise<Account[]> {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts (status ${response.status})`);
  }

  const json: ApiResponse<Account[]> = await response.json();
  return json.data;
}

/**
 * Fetches categories list from GET /api/categories
 */
export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories (status ${response.status})`);
  }

  const json: ApiResponse<Category[]> = await response.json();
  return json.data;
}

/**
 * Fetches transactions from GET /api/transactions
 */
export async function getTransactions(): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions (status ${response.status})`);
  }

  const json: ApiResponse<Transaction[]> = await response.json();
  return json.data;
}

/**
 * Updates a transaction via PATCH /api/transactions/:id
 */
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
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transaction> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to update transaction (${response.status})`);
  }

  return json.data;
}

/**
 * Deletes a transaction via DELETE /api/transactions/:id
 */
export async function deleteTransaction(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to delete transaction (${response.status})`);
  }
}

/**
 * Fetches transfers from GET /api/transfers
 */
export async function getTransfers(): Promise<Transfer[]> {
  const response = await fetch(`${API_BASE_URL}/transfers`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transfers (status ${response.status})`);
  }

  const json: ApiResponse<Transfer[]> = await response.json();
  return json.data;
}

/**
 * Updates a transfer via PATCH /api/transfers/:id
 */
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
  const response = await fetch(`${API_BASE_URL}/transfers/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transfer> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to update transfer (${response.status})`);
  }

  return json.data;
}

/**
 * Deletes a transfer via DELETE /api/transfers/:id
 */
export async function deleteTransfer(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/transfers/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Failed to delete transfer (${response.status})`);
  }
}
