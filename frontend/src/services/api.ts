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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Checks connectivity to the DhanAdhyaksh backend API.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      Accept: 'application/json',
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
      Accept: 'application/json',
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
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories (status ${response.status})`);
  }

  const json: ApiResponse<Category[]> = await response.json();
  return json.data;
}

/**
 * Creates a transaction (INCOME or EXPENSE) via POST /api/transactions
 */
export async function createTransaction(data: {
  accountId: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  source?: string | null;
  categoryId?: number | null;
  note?: string | null;
  transactionDate: string;
}): Promise<Transaction> {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transaction> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to create transaction (${response.status})`
    );
  }

  return json.data;
}

/**
 * Fetches transactions from GET /api/transactions
 */
export async function getTransactions(): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    headers: {
      Accept: 'application/json',
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
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transaction> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to update transaction (${response.status})`
    );
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
      Accept: 'application/json',
    },
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to delete transaction (${response.status})`
    );
  }
}

/**
 * Creates a transfer via POST /api/transfers
 */
export async function createTransfer(data: {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note?: string | null;
  transferDate: string;
}): Promise<Transfer> {
  const response = await fetch(`${API_BASE_URL}/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transfer> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to create transfer (${response.status})`
    );
  }

  return json.data;
}

/**
 * Fetches transfers from GET /api/transfers
 */
export async function getTransfers(): Promise<Transfer[]> {
  const response = await fetch(`${API_BASE_URL}/transfers`, {
    headers: {
      Accept: 'application/json',
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
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Transfer> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to update transfer (${response.status})`
    );
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
      Accept: 'application/json',
    },
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to delete transfer (${response.status})`
    );
  }
}

/**
 * Fetches goals from GET /api/goals
 */
export async function getGoals(): Promise<Goal[]> {
  const response = await fetch(`${API_BASE_URL}/goals`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch goals (status ${response.status})`);
  }

  const json: ApiResponse<Goal[]> = await response.json();
  return json.data;
}

/**
 * Fetches single goal by ID from GET /api/goals/:id
 */
export async function getGoalById(id: number): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch goal (status ${response.status})`);
  }

  const json: ApiResponse<Goal> = await response.json();
  return json.data;
}

/**
 * Creates a new goal via POST /api/goals
 */
export async function createGoal(data: {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
}): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to create goal (${response.status})`
    );
  }

  return json.data;
}

/**
 * Updates a goal via PATCH /api/goals/:id
 */
export async function updateGoal(
  id: number,
  data: Partial<{
    name: string;
    targetAmount: number;
    targetDate: string | null;
    isCompleted: boolean;
  }>
): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to update goal (${response.status})`
    );
  }

  return json.data;
}

/**
 * Deletes a goal via DELETE /api/goals/:id
 */
export async function deleteGoal(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const json: ApiResponse<unknown> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to delete goal (${response.status})`
    );
  }
}

/**
 * Allocates physical cash from account to goal via POST /api/goals/:id/allocations
 */
export async function allocateGoal(
  goalId: number,
  data: {
    accountId: number;
    amount: number;
  }
): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/goals/${goalId}/allocations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to allocate cash (${response.status})`
    );
  }

  return json.data;
}

/**
 * Updates an allocation amount via PATCH /api/goals/:goalId/allocations/:allocationId
 */
export async function updateGoalAllocation(
  goalId: number,
  allocationId: number,
  data: { amount: number }
): Promise<Goal> {
  const response = await fetch(
    `${API_BASE_URL}/goals/${goalId}/allocations/${allocationId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to update allocation (${response.status})`
    );
  }

  return json.data;
}

/**
 * Deletes a goal allocation via DELETE /api/goals/:goalId/allocations/:allocationId
 */
export async function deleteGoalAllocation(
  goalId: number,
  allocationId: number
): Promise<Goal> {
  const response = await fetch(
    `${API_BASE_URL}/goals/${goalId}/allocations/${allocationId}`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  const json: ApiResponse<Goal> = await response.json();

  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to release allocation (${response.status})`
    );
  }

  return json.data;
}
